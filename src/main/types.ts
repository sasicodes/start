export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh';
export type ThinkingLevel = 'off' | 'minimal' | EffortLevel;
export type ProviderKey = 'anthropic' | 'openai';

export const effortLevels: EffortLevel[] = ['low', 'medium', 'high', 'xhigh'];
export const enabledTools = ['ls', 'read', 'edit', 'find', 'grep', 'bash', 'write'];
export type ChatStatus = {
  ready: boolean;
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

export type WorkspaceFolder = {
  name: string;
  path: string;
  modified: number;
  sessionCount: number;
};

export type OpenSessionResult = {
  ok: boolean;
  id?: string;
  messages?: HistoryMessage[];
  error?: string;
};
