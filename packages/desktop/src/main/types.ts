export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh';
export type ThinkingLevel = 'off' | 'minimal' | EffortLevel;
export type ProviderKey = 'anthropic' | 'openai';

export const effortLevels: EffortLevel[] = ['low', 'medium', 'high', 'xhigh'];
export const enabledTools = ['ls', 'read', 'edit', 'find', 'grep', 'bash', 'write'];
export type ChatStatus = {
  ready: boolean;
  workspacePath: string;
  modelLabel?: string;
  selectedModelKey?: string;
  sessionId?: string;
  thinkingLevel?: EffortLevel;
  error?: string;
};

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

export type ThinkingModel = {
  reasoning: boolean;
  thinkingLevelMap?: Partial<Record<ThinkingLevel, string | null>>;
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
  queued?: boolean;
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

export type QueuedMessageKind = 'followUp' | 'steer';

export type QueuedMessage = {
  id: string;
  kind: QueuedMessageKind;
  text: string;
};

export type QueuedTurnStart = {
  id: string;
  text: string;
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

export type SessionNoticeKind = 'completed' | 'failed';

export type RecentSession = {
  id: string;
  path: string;
  title: string;
  modified: number;
  noticeKind?: SessionNoticeKind;
};

export type RecentSessionsOptions = {
  limit?: number;
  offset?: number;
  workspacePath?: string;
};

export type RecentSessionsPage = {
  hasMore: boolean;
  sessions: RecentSession[];
};

export type ScopedChatEvent<T> = {
  payload: T;
  tabId: string;
  workspacePath: string;
};

export type WorkspaceFolder = {
  name: string;
  path: string;
  modified: number;
  sessionCount: number;
  noticeKind?: SessionNoticeKind;
};

export type AgentTabStatus = 'idle' | 'generating' | 'completed' | 'failed';

export type AgentTab = {
  id: string;
  sessionId?: string;
  status: AgentTabStatus;
  workspacePath: string;
};

export type SessionNotice = {
  seenAt?: number;
  createdAt: number;
  sessionId: string;
  workspacePath: string;
  kind: SessionNoticeKind;
};

export type SwitchWorkspaceResult = {
  ok: boolean;
  cancelled?: boolean;
  status?: ChatStatus;
  error?: string;
};

export type OpenSessionResult = {
  ok: boolean;
  id?: string;
  turns?: HistoryTurn[];
  error?: string;
};
