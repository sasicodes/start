export type EffortLevel = 'high' | 'low' | 'xhigh' | 'medium';
export type ThinkingLevel = 'off' | 'minimal' | EffortLevel;
export type ProviderKey = 'google' | 'openai' | 'anthropic';

export const effortLevels: EffortLevel[] = ['low', 'medium', 'high', 'xhigh'];

export type ChatStatus = {
  ready: boolean;
  error?: string;
  sessionId?: string;
  modelLabel?: string;
  workspacePath: string;
  isGenerating?: boolean;
  contextPercent?: number;
  selectedModelKey?: string;
  thinkingLevel?: EffortLevel;
};

export type ModelOption = {
  id: string;
  key: string;
  name: string;
  provider: string;
  isCustom?: boolean;
  reasoning: boolean;
  contextWindow: number;
  input: ('text' | 'image')[];
  effortLevels: EffortLevel[];
};

export type ProviderAuthKind = 'none' | 'api_key' | 'unknown' | 'subscription';

export type ProviderAuthStatus = {
  key: string;
  name: string;
  label: string;
  connected: boolean;
  kind: ProviderAuthKind;
  hasCredentials: boolean;
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

export type QueuedMessageKind = 'steer' | 'followUp';

export type QueuedMessage = {
  id: string;
  text: string;
  kind: QueuedMessageKind;
};

export type QueuedTurnStart = {
  id: string;
  text: string;
};

export type TurnDetailKind = 'tool' | 'error' | 'metadata';
export type TurnDetailState = 'done' | 'error' | 'active' | 'queued';

export type ChatEvent = {
  key: string;
  body?: string;
  title: string;
  detail?: string;
  metric?: string;
  kind: TurnDetailKind;
  state: TurnDetailState;
  subagents?: SubagentActivity[];
};

export type SubagentStatus = 'cancelled' | 'completed' | 'failed' | 'queued' | 'running';

export interface SubagentActivity {
  id: string;
  name: string;
  task: string;
  avatar: string;
  summary?: string;
  accentColor: string;
  status: SubagentStatus;
}

export type HistoryTurnDetail = ChatEvent & {
  id: string;
  count: number;
  createdAt: number;
  updatedAt: number;
};

export type HistoryTurn = {
  id: string;
  text: string;
  createdAt: number;
  thinking?: string;
  streaming?: boolean;
  details?: HistoryTurnDetail[];
  role: 'user' | 'event' | 'terminal' | 'assistant';
};

export type SessionNoticeKind = 'failed' | 'completed';

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
  archived?: boolean;
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
  status?: AgentTabStatus;
  sessionCount: number;
  noticeKind?: SessionNoticeKind;
};

export type AgentTabStatus = 'idle' | 'failed' | 'completed' | 'generating';

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
  cancelled?: boolean;
  status?: ChatStatus;
};

export type OpenSessionResult = {
  ok: boolean;
  id?: string;
  error?: string;
  turns?: HistoryTurn[];
};
