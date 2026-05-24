export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh';
export type ThinkingLevel = 'off' | 'minimal' | EffortLevel;
export type ProviderKey = 'anthropic' | 'openai';

export const effortLevels: EffortLevel[] = ['low', 'medium', 'high', 'xhigh'];
export type ChatStatus = {
  ready: boolean;
  error?: string;
  isGenerating?: boolean;
  sessionId?: string;
  modelLabel?: string;
  workspacePath: string;
  selectedModelKey?: string;
  thinkingLevel?: EffortLevel;
};

export type ModelOption = {
  id: string;
  key: string;
  name: string;
  provider: string;
  reasoning: boolean;
  contextWindow: number;
  effortLevels: EffortLevel[];
  input: ('text' | 'image')[];
};

export type ProviderAuthKind = 'api_key' | 'none' | 'subscription' | 'unknown';

export type ProviderAuthStatus = {
  key: string;
  name: string;
  label: string;
  connected: boolean;
  kind: ProviderAuthKind;
};

export type ProviderLoginResult = {
  ok: boolean;
  error?: string;
  providers: ProviderAuthStatus[];
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
  error?: string;
  queued?: boolean;
  sessionId?: string;
};

export type CommandResult = {
  ok: boolean;
  error?: string;
  output?: string;
  exitCode?: number;
  sessionId?: string;
};

export type QueuedMessageKind = 'followUp' | 'steer';

export type QueuedMessage = {
  id: string;
  text: string;
  kind: QueuedMessageKind;
};

export type QueuedTurnStart = {
  id: string;
  text: string;
};

export type TurnDetailKind = 'error' | 'metadata' | 'tool';
export type TurnDetailState = 'active' | 'done' | 'error' | 'queued';

export type ChatEvent = {
  key: string;
  body?: string;
  title: string;
  detail?: string;
  metric?: string;
  kind: TurnDetailKind;
  state: TurnDetailState;
};

export type HistoryTurnDetail = ChatEvent & {
  id: string;
  count: number;
  createdAt: number;
  updatedAt: number;
};

export type HistoryTurn = {
  id: string;
  text: string;
  thinking?: string;
  streaming?: boolean;
  createdAt: number;
  details?: HistoryTurnDetail[];
  role: 'user' | 'assistant' | 'terminal' | 'event';
};

export type SessionNoticeKind = 'completed' | 'failed';

export type RecentSession = {
  id: string;
  path: string;
  title: string;
  modified: number;
  status?: AgentTabStatus;
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
  status?: AgentTabStatus;
  noticeKind?: SessionNoticeKind;
};

export type AgentTabStatus = 'idle' | 'generating' | 'completed' | 'failed';

export type AgentTab = {
  id: string;
  sessionId?: string;
  workspacePath: string;
  status: AgentTabStatus;
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
  error?: string;
  status?: ChatStatus;
  cancelled?: boolean;
};

export type OpenSessionResult = {
  ok: boolean;
  id?: string;
  error?: string;
  turns?: HistoryTurn[];
};
