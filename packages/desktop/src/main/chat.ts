import '@main/environment';

import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import {
  type AgentSession,
  AuthStorage,
  createAgentSession,
  getLastAssistantUsage,
  ModelRegistry,
  SessionManager,
  SettingsManager
} from '@earendil-works/pi-coding-agent';
import { appVersion, baseDir } from '@main/application';
import {
  type PreparedImageAttachment,
  prepareClipboardImage as prepareClipboardImageAttachment,
  prepareDroppedFiles as prepareDroppedFileAttachments,
  stripAttachmentData
} from '@main/attachments';
import { type SlashCommandItem, sessionSlashCommandItems } from '@main/chat/commands';
import { contextPercent } from '@main/chat/context';
import { shouldCompleteAfterStreamError } from '@main/chat/errors';
import { appendLiveAssistantTurn } from '@main/chat/live';
import { type LiveRecentSession, recentSessionsPage } from '@main/chat/recents';
import { sessionWorkspacePath, tabFromSession, tabFromSessionStatus } from '@main/chat/tabs';
import { closeStartDb, openStartDb } from '@main/db';
import { historyDetail, imageAttachments, textContent } from '@main/details';
import { chatEvent } from '@main/events';
import { addWorktree, getGitBranch, gitTopLevel } from '@main/git';
import {
  agentEndError,
  clampThinkingLevel,
  getSupportedEffortLevels,
  getVisibleModels,
  isProviderModel,
  modelKey,
  modelLabel,
  providerAuthKind,
  providerAuthLabel,
  providerAuthSlots,
  textDelta,
  thinkingDelta
} from '@main/helpers';
import { historyTurns } from '@main/history';
import { createStartResourceLoader } from '@main/prompt/loader';
import { resolveAuthBackend } from '@main/providers/auth';
import { InMemorySettingsBackend } from '@main/providers/settings';
import { createStartCustomTools } from '@main/providers/tools/index';
import type { SessionController, SessionEnvironment, SessionSummary } from '@main/providers/tools/sessions';
import type { WorktreeOwner } from '@main/providers/tools/worktree';
import { disposeWorkspaceFinders, refreshWorkspaceFinder, warmWorkspaceFinder } from '@main/search/client';
import {
  archiveSession,
  getSession,
  listRecentSessions,
  listSessionsByCwd,
  truncateTitle,
  unarchiveSession,
  updateSessionOnTurnEnd,
  updateSessionThinkingLevel,
  updateSessionTitle,
  upsertSessionOnStart
} from '@main/sessions';
import { readStartState, type StartState, updateStartState } from '@main/storage';
import { SubagentNameAllocator } from '@main/subagents/allocator';
import {
  type AgentTab,
  type AgentTabStatus,
  type ChatEvent,
  type ChatStatus,
  type CommandResult,
  type EffortLevel,
  effortLevels,
  type HistoryTurn,
  type ImageAttachment,
  type MobileModelsState,
  type MobileSession,
  type MobileSessionIndex,
  type MobileSessionMessage,
  type MobileSessionMessagesPage,
  type ModelOption,
  type OpenSessionResult,
  type PreparedDropFiles,
  type ProviderAuthStatus,
  type ProviderKey,
  type ProviderLoginResult,
  type QueuedMessage,
  type RecentSessionsOptions,
  type RecentSessionsPage,
  type SendResult,
  type SessionNotice,
  type StatusItemRecentSession,
  type SwitchWorkspaceResult,
  type WorkspaceFolder
} from '@main/types';
import { workspaceDisplayName } from '@main/utils/workspace';
import { sendToRendererWindows } from '@main/window';
import { activateWorkspaceAccess } from '@main/workspace/access';
import { workspaceHistoryWith } from '@main/workspace/history';
import { isManagedWorktree, worktreeBranch, worktreePathFor, worktreeSlug } from '@main/workspace/worktree';
import type { WebContents } from 'electron';
import electron from 'electron';

const { shell } = electron;

const attachmentMaxAgeMs = 15 * 60 * 1000;
const mobileMaxPageLimit = 50;
const mobileDefaultMessageLimit = 10;
const mobileDefaultSessionLimit = 40;
const mobileStreamNotifyMinIntervalMs = 750;

const enableRegisteredTools = (session: AgentSession) => {
  session.setActiveToolsByName(session.getAllTools().map(({ name }) => name));
};

type SessionEntries = ReturnType<SessionManager['getEntries']>;

const firstUserMessageText = (entries: SessionEntries): string => {
  for (const entry of entries) {
    if (entry.type === 'message' && entry.message.role === 'user') {
      return textContent(entry.message.content);
    }
  }
  return '';
};

const mobilePageLimit = (limit: number = 0, fallback: number): number => {
  if (!limit || !Number.isFinite(limit)) return fallback;
  return Math.max(1, Math.min(mobileMaxPageLimit, Math.floor(limit)));
};

const mobilePageOffset = (offset: number = 0): number => {
  if (!offset || !Number.isFinite(offset)) return 0;
  return Math.max(0, Math.floor(offset));
};

const mobileVisibleTurn = (turn: HistoryTurn): turn is HistoryTurn & { role: 'assistant' | 'user' } => {
  if (turn.role === 'user') return Boolean(turn.text.trim());
  if (turn.role !== 'assistant') return false;
  return Boolean(turn.text.trim() || turn.thinking?.trim());
};

const mobileTurnDurationMs = (turn: HistoryTurn): number => {
  if (turn.role !== 'assistant') return 0;
  if (turn.streaming) return Math.max(0, Date.now() - turn.createdAt);

  const completedAt = Math.max(turn.createdAt, ...(turn.details ?? []).map((detail) => detail.updatedAt));
  return Math.max(0, completedAt - turn.createdAt);
};

const streamingTurnId = (session: AgentSession) => `streaming:${session.sessionManager.getSessionId()}`;

type LiveAssistantTurn = {
  id: string;
  text: string;
  thinking: string;
  createdAt: number;
  details: NonNullable<HistoryTurn['details']>;
};

const liveAssistantHistoryTurn = (turn: LiveAssistantTurn): HistoryTurn => ({
  id: turn.id,
  text: turn.text,
  streaming: true,
  role: 'assistant',
  createdAt: turn.createdAt,
  ...(turn.thinking ? { thinking: turn.thinking } : {}),
  ...(turn.details && turn.details.length > 0 ? { details: turn.details } : {})
});

const liveAssistantPlaceholder = (session: AgentSession): LiveAssistantTurn => {
  return {
    text: '',
    details: [],
    thinking: '',
    createdAt: Date.now(),
    id: streamingTurnId(session)
  };
};

type SessionImageAttachment = { type: 'image'; data: string; mimeType: string };

type PendingQueuedMessage = QueuedMessage & {
  images?: SessionImageAttachment[];
};

interface MobileSendInput {
  text: string;
  sessionId?: string;
  workspacePath?: string;
}

interface MobileSessionChange {
  sessionId: string;
  workspacePath: string;
}

type MobileSessionChangeHandler = (change: MobileSessionChange) => void;

const visibleQueuedMessage = (message: PendingQueuedMessage): QueuedMessage => ({
  id: message.id,
  kind: message.kind,
  text: message.text,
  ...(message.images && message.images.length > 0 ? { attachmentCount: message.images.length } : {})
});

type SessionRuntimeState = {
  abortSequence: number;
  isGenerating: boolean;
  queueRebuildDepth: number;
  liveAssistantTurn?: LiveAssistantTurn;
  queuedMessages: PendingQueuedMessage[];
  queueDeliveryCandidates: QueuedMessage[];
};

const createSessionRuntimeState = (): SessionRuntimeState => ({
  abortSequence: 0,
  queuedMessages: [],
  isGenerating: false,
  queueRebuildDepth: 0,
  queueDeliveryCandidates: []
});

export class ChatService {
  private activeSessionId = '';
  private sessionOpenSequence = 0;
  private shouldCreateSession = true;
  private appState = readStartState();
  private session: AgentSession | null = null;
  private resourceRefreshPromise: Promise<boolean> | null = null;
  private workspaceCwd = this.appState.lastWorkspace ?? homedir();
  private authInputReject: ((error: Error) => void) | null = null;
  private authInputResolve: ((value: string) => void) | null = null;
  private selectedModelKey: string | null = this.appState.selectedModelKey ?? null;
  private selectedThinkingLevel: EffortLevel = this.appState.selectedThinkingLevel;

  private readonly db = openStartDb();
  private readonly authStorage = AuthStorage.fromStorage(resolveAuthBackend(this.db));
  private readonly modelRegistry = ModelRegistry.create(this.authStorage);
  private readonly settingsManager = SettingsManager.fromStorage(new InMemorySettingsBackend());
  private readonly liveTitles = new Map<string, string>();
  private readonly backgroundSessions = new Map<string, AgentSession>();
  private readonly activeSessionByWorkspace = new Map<string, string>();
  private readonly queueUpdateSignatures = new WeakMap<WebContents, string>();
  private readonly notices = new Map<string, SessionNotice>(Object.entries(this.appState.sessionNotices ?? {}));
  private readonly sessionRuntimeStates = new Map<string, SessionRuntimeState>();
  private readonly subagentNameAllocators = new Map<string, SubagentNameAllocator>();
  private readonly attachments = new Map<string, { createdAt: number; data: string; mimeType: string }>();
  private mobileSessionChangeHandler: MobileSessionChangeHandler = () => {};

  constructor() {
    this.modelRegistry.refresh();
    this.persistState({ workspaceHistory: this.workspaceHistoryFor(this.workspaceCwd) });
    this.warmWorkspaceSearch();
  }

  setMobileSessionChangeHandler(handler: MobileSessionChangeHandler): void {
    this.mobileSessionChangeHandler = handler;
  }

  async getStatus(): Promise<ChatStatus> {
    this.refreshAuth();
    const model = this.pickModel();

    if (!model) {
      return {
        ready: false,
        workspacePath: this.workspaceCwd,
        thinkingLevel: this.selectedThinkingLevel,
        error:
          this.modelRegistry.getError() ?? 'No configured models found. Sign in or configure credentials to continue.'
      };
    }

    const sessionId = this.reportableActiveSessionId();
    const percent = this.sessionContextPercent(model.contextWindow);

    return {
      ready: true,
      workspacePath: this.workspaceCwd,
      modelLabel: modelLabel(model),
      isGenerating: Boolean(this.session && this.sessionIsGenerating(this.session)),
      selectedModelKey: modelKey(model),
      ...(sessionId ? { sessionId } : {}),
      ...(percent > 0 ? { contextPercent: percent } : {}),
      thinkingLevel: this.selectedThinkingLevel
    };
  }

  private sessionContextPercent(contextWindow: number): number {
    if (!this.session) return 0;
    const entries = this.session.sessionManager.getEntries();
    return contextPercent(getLastAssistantUsage(entries), contextWindow);
  }

  async getSlashCommands(): Promise<SlashCommandItem[]> {
    const session = await this.getSession();
    return sessionSlashCommandItems(session);
  }

  async refreshActiveSessionResources(): Promise<boolean> {
    if (this.resourceRefreshPromise) return false;
    if (!this.session) return false;
    if (this.sessionIsGenerating(this.session)) return false;

    const refresh = this.session.reload().then(() => true);
    this.resourceRefreshPromise = refresh;

    try {
      return await refresh;
    } finally {
      if (this.resourceRefreshPromise === refresh) this.resourceRefreshPromise = null;
    }
  }

  async archiveSession(sessionId: string): Promise<string> {
    const cwd = getSession(sessionId)?.cwd ?? this.workspaceCwd;
    archiveSession(sessionId);
    return cwd;
  }

  async unarchiveSession(sessionId: string): Promise<string> {
    const cwd = getSession(sessionId)?.cwd ?? this.workspaceCwd;
    unarchiveSession(sessionId);
    return cwd;
  }

  async renameSession(sessionId: string, title: string): Promise<string> {
    const cwd = getSession(sessionId)?.cwd ?? this.workspaceCwd;
    updateSessionTitle(sessionId, title);
    return cwd;
  }

  async getModels(): Promise<{
    models: ModelOption[];
    error?: string;
    selectedModelKey?: string;
  }> {
    this.refreshAuth();
    const available = this.getPickerModels();
    const models = available.map((model) => ({
      key: modelKey(model),
      id: model.id,
      name: modelLabel(model),
      provider: model.provider,
      reasoning: model.reasoning,
      effortLevels: getSupportedEffortLevels(model),
      input: model.input,
      contextWindow: model.contextWindow
    }));
    const selected = this.pickModel();

    const error = models.length === 0 ? this.modelRegistry.getError() : '';

    return {
      models,
      ...(error ? { error } : {}),
      ...(selected ? { selectedModelKey: modelKey(selected) } : {})
    };
  }

  async getMobileModelsState(): Promise<MobileModelsState> {
    const result = await this.getModels();
    return {
      thinkingLevel: this.selectedThinkingLevel,
      models: result.models.map((model) => ({
        key: model.key,
        name: model.name,
        provider: model.provider,
        reasoning: model.reasoning,
        effortLevels: model.effortLevels
      })),
      ...(result.selectedModelKey ? { selectedModelKey: result.selectedModelKey } : {})
    };
  }

  async getMobileSessionIndex(options: RecentSessionsOptions = {}): Promise<MobileSessionIndex> {
    const workspacePath = options.workspacePath ?? this.workspaceCwd;
    const limit = mobilePageLimit(options.limit, mobileDefaultSessionLimit);
    const offset = mobilePageOffset(options.offset);
    const branchName = await getGitBranch(workspacePath);
    const workspace = {
      path: workspacePath,
      name: workspaceDisplayName(workspacePath),
      ...(branchName ? { branchName } : {})
    };

    if (!options.workspacePath) {
      const rows = listRecentSessions({ limit: limit + offset + 1 });
      const statuses = new Map(this.getTabs().map((tab) => [tab.id, tab.status]));
      const sessions = rows.slice(offset, offset + limit);

      return {
        workspace,
        hasMore: rows.length > offset + limit,
        sessions: sessions.map((session): MobileSession => {
          const status = statuses.get(session.id);
          const notice = this.notices.get(session.id);
          return {
            id: session.id,
            title: session.title,
            modified: session.updatedAt,
            workspaceName: workspaceDisplayName(session.cwd),
            workspacePath: session.cwd,
            ...(status ? { status } : {}),
            ...(notice ? { noticeKind: notice.kind } : {})
          };
        })
      };
    }

    const page = await this.getRecentSessionsPage({ ...options, limit, offset, workspacePath });
    const workspaceName = workspaceDisplayName(workspacePath);

    return {
      hasMore: page.hasMore,
      workspace,
      sessions: page.sessions.map(
        (session): MobileSession => ({
          id: session.id,
          title: session.title,
          modified: session.modified,
          workspaceName,
          workspacePath,
          ...(session.status ? { status: session.status } : {}),
          ...(session.noticeKind ? { noticeKind: session.noticeKind } : {})
        })
      )
    };
  }

  async getMobileSessionMessages(
    sessionId: string,
    options: Pick<RecentSessionsOptions, 'limit' | 'offset'> = {}
  ): Promise<MobileSessionMessagesPage> {
    const id = sessionId.trim();
    if (!id) throw new Error('Session id is empty.');

    const record = getSession(id);
    if (!record) throw new Error('Session could not be found.');

    const limit = mobilePageLimit(options.limit, mobileDefaultMessageLimit);
    const offset = mobilePageOffset(options.offset);
    const turns = this.mobileSessionTurns(id, record.path).filter(mobileVisibleTurn);
    const branchName = await getGitBranch(record.cwd);
    const end = Math.max(0, turns.length - offset);
    const start = Math.max(0, end - limit);
    const messages = turns.slice(start, end).map((turn): MobileSessionMessage => {
      const message: MobileSessionMessage = {
        id: turn.id,
        text: turn.text,
        role: turn.role,
        createdAt: turn.createdAt
      };
      const durationMs = mobileTurnDurationMs(turn);
      if (durationMs > 0) message.durationMs = durationMs;
      if (turn.thinking) message.thinking = turn.thinking;
      if (turn.streaming) message.streaming = true;
      return message;
    });

    return {
      messages,
      sessionId: id,
      title: record.title,
      nextOffset: offset + messages.length,
      hasMoreOlder: start > 0,
      workspace: {
        path: record.cwd,
        name: workspaceDisplayName(record.cwd),
        ...(branchName ? { branchName } : {})
      }
    };
  }

  async sendMobileMessage(input: MobileSendInput): Promise<SendResult> {
    const text = input.text.trim();
    if (!text) return { ok: false, error: 'Prompt is empty.' };

    if (input.sessionId) return this.sendToTab(input.sessionId, text);

    if (input.workspacePath && input.workspacePath !== this.workspaceCwd) {
      const result = await this.switchWorkspace(input.workspacePath);
      if (!result.ok) return { ok: false, error: result.error ?? 'Workspace could not be switched.' };
    }

    await this.newSession();
    return this.send(text);
  }

  async openSession(path: string): Promise<OpenSessionResult> {
    const openSequence = this.sessionOpenSequence + 1;
    this.sessionOpenSequence = openSequence;

    try {
      this.refreshAuth();
      const model = this.pickModel();
      if (!model) return { ok: false, error: this.modelRegistry.getError() ?? 'No configured models found.' };

      const sessionManager = SessionManager.open(path);
      const workspacePath = sessionManager.getCwd() || this.workspaceCwd;
      if (this.session) this.storeBackgroundSession(this.workspaceCwd, this.session);
      this.session = null;
      const resourceLoader = await createStartResourceLoader(workspacePath);
      const { session } = await createAgentSession({
        cwd: workspacePath,
        model,
        sessionManager,
        resourceLoader,
        authStorage: this.authStorage,
        modelRegistry: this.modelRegistry,
        customTools: createStartCustomTools(this.subagentToolsOptions(sessionManager.getSessionId(), workspacePath)),
        settingsManager: this.settingsManager,
        thinkingLevel: this.selectedThinkingLevel
      });

      if (this.sessionOpenSequence !== openSequence) {
        this.parkSupersededSession(session);
        return { ok: false, error: 'Session open was superseded.' };
      }

      enableRegisteredTools(session);
      this.subscribeIndexSync(session, model.provider, model.id);
      this.session = session;
      this.workspaceCwd = workspacePath;
      this.runtimeStateForSession(session).isGenerating = false;
      this.setActiveSession(sessionManager);
      this.persistWorkspace(this.workspaceCwd);
      activateWorkspaceAccess(this.workspaceCwd);
      this.refreshWorkspaceSearch();
      this.shouldCreateSession = false;
      return {
        ok: true,
        id: sessionManager.getSessionId(),
        turns: this.sessionTurns(session)
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Session could not be opened.' };
    }
  }

  async openSessionId(sessionId: string): Promise<OpenSessionResult> {
    const id = sessionId.trim();
    if (!id) return { ok: false, error: 'Session id is empty.' };
    if (this.session?.sessionManager.getSessionId() === id) {
      return { ok: true, id, turns: this.sessionTurns(this.session) };
    }
    if (this.backgroundSessions.has(id)) return this.activateTab(id);

    const sessions = await SessionManager.listAll();
    const session = sessions.find((entry) => entry.id === id);
    if (!session) return { ok: false, error: 'Session could not be found.' };

    return this.openSession(session.path);
  }

  private liveSessionTitle(sessionId: string, sessionManager: AgentSession['sessionManager']): string {
    const cached = this.liveTitles.get(sessionId);
    if (cached) return cached;

    const title = truncateTitle(firstUserMessageText(sessionManager.getEntries()));
    if (title) this.liveTitles.set(sessionId, title);
    return title;
  }

  private liveRecentSession(session: AgentSession, workspacePath: string): LiveRecentSession | null {
    if (!this.sessionIsReportable(session) || !this.sessionIsGenerating(session)) return null;

    const sessionManager = session.sessionManager;
    const sessionId = sessionManager.getSessionId();
    const path = sessionManager.getSessionFile();
    if (!path) return null;

    const notice = this.notices.get(sessionId);

    return {
      path,
      workspacePath,
      id: sessionId,
      status: 'generating',
      modified: Date.now(),
      title: this.liveSessionTitle(sessionId, sessionManager),
      ...(notice ? { noticeKind: notice.kind } : {})
    };
  }

  private liveRecentSessions(): LiveRecentSession[] {
    const sessions: LiveRecentSession[] = [];
    const activeSession = this.session ? this.liveRecentSession(this.session, this.workspaceCwd) : null;
    if (activeSession) sessions.push(activeSession);

    for (const session of this.backgroundSessions.values()) {
      const recentSession = this.liveRecentSession(session, sessionWorkspacePath(session, this.workspaceCwd));
      if (recentSession) sessions.push(recentSession);
    }

    return sessions;
  }

  getTabs(): AgentTab[] {
    const tabs = new Map<string, AgentTab>();
    if (this.session && this.sessionIsReportable(this.session)) {
      const sessionId = this.session.sessionManager.getSessionId();
      const status = this.sessionIsGenerating(this.session) ? 'generating' : 'idle';
      tabs.set(sessionId, tabFromSessionStatus(this.session, status, this.workspaceCwd));
    }

    for (const session of this.backgroundSessions.values()) {
      if (!this.sessionIsReportable(session)) continue;

      const sessionId = session.sessionManager.getSessionId();
      const notice = this.notices.get(sessionId);
      if (this.sessionIsGenerating(session)) {
        tabs.set(
          sessionId,
          tabFromSessionStatus(session, 'generating', sessionWorkspacePath(session, this.workspaceCwd))
        );
        continue;
      }

      tabs.set(sessionId, tabFromSession(session, this.workspaceCwd, notice));
    }

    return [...tabs.values()];
  }

  private async buildSession(workspacePath: string): Promise<AgentSession> {
    this.refreshAuth();
    const model = this.pickModel();
    if (!model) throw new Error(this.modelRegistry.getError() ?? 'No configured models found.');

    const sessionManager = SessionManager.create(workspacePath);
    const resourceLoader = await createStartResourceLoader(workspacePath);
    const { session } = await createAgentSession({
      cwd: workspacePath,
      model,
      sessionManager,
      resourceLoader,
      authStorage: this.authStorage,
      modelRegistry: this.modelRegistry,
      customTools: createStartCustomTools(this.subagentToolsOptions(sessionManager.getSessionId(), workspacePath)),
      settingsManager: this.settingsManager,
      thinkingLevel: this.selectedThinkingLevel
    });
    enableRegisteredTools(session);
    this.subscribeIndexSync(session, model.provider, model.id);
    return session;
  }

  async createTab(workspacePath = this.workspaceCwd): Promise<AgentTab> {
    const session = await this.buildSession(workspacePath);
    if (this.session) this.storeBackgroundSession(this.workspaceCwd, this.session);
    this.attachments.clear();
    this.session = session;
    this.workspaceCwd = workspacePath;
    this.runtimeStateForSession(session).isGenerating = false;
    this.shouldCreateSession = false;
    this.setActiveSession(session.sessionManager);
    this.persistWorkspace(this.workspaceCwd);
    activateWorkspaceAccess(this.workspaceCwd);
    this.refreshWorkspaceSearch();

    const sessionId = session.sessionManager.getSessionId();
    return {
      id: sessionId,
      sessionId,
      status: 'idle',
      workspacePath
    };
  }

  private async addManagedWorktree(branchName?: string, base?: string): Promise<string> {
    const repoRoot = await gitTopLevel(this.workspaceCwd);
    if (!repoRoot) return '';
    const slug = `${worktreeSlug(branchName ?? '')}-${randomUUID().slice(0, 8)}`;
    const worktree = await addWorktree(repoRoot, worktreePathFor(baseDir, repoRoot, slug), {
      branch: worktreeBranch(slug),
      ...(base ? { base } : {})
    });
    return worktree ? worktree.path : '';
  }

  async createWorktreeTab(branchName?: string, base?: string): Promise<AgentTab> {
    const worktreePath = await this.addManagedWorktree(branchName, base);
    return worktreePath ? this.createTab(worktreePath) : this.createTab();
  }

  private async createBackgroundSession(workspacePath: string): Promise<AgentSession> {
    const session = await this.buildSession(workspacePath);
    this.backgroundSessions.set(session.sessionManager.getSessionId(), session);
    this.runtimeStateForSession(session).isGenerating = false;
    return session;
  }

  async closeTab(id: string): Promise<void> {
    if (this.activeSessionId === id && this.session) {
      this.session.abortBash();
      await this.session.abort();
      this.session.dispose();
      this.deleteRuntimeState(id);
      this.deleteSubagentNameAllocator(id);
      this.session = null;
      this.activeSessionByWorkspace.delete(this.workspaceCwd);
      this.activeSessionId = '';
      this.shouldCreateSession = true;
    }

    const session = this.backgroundSessions.get(id);
    if (session) {
      session.abortBash();
      await session.abort();
      session.dispose();
      this.backgroundSessions.delete(id);
      this.deleteRuntimeState(id);
      this.deleteSubagentNameAllocator(id);
    }

    this.deleteWorkspaceSessionReferences(id);
    this.markNoticeSeen(id);
  }

  async sendToTab(id: string, prompt: string, webContents?: WebContents, attachments: ImageAttachment[] = []) {
    await this.activateTab(id);
    return this.send(prompt, webContents, attachments);
  }

  async abortTab(id: string, webContents?: WebContents): Promise<void> {
    if (this.activeSessionId === id) return this.abort(webContents);
    const session = this.backgroundSessions.get(id);
    const runtimeState = session ? this.runtimeStateForSession(session) : null;
    if (runtimeState) {
      runtimeState.abortSequence += 1;
      runtimeState.queuedMessages = [];
      runtimeState.queueDeliveryCandidates = [];
      delete runtimeState.liveAssistantTurn;
    }
    session?.clearQueue();
    session?.abortBash();
    await session?.abort();
  }

  async getNotices(): Promise<SessionNotice[]> {
    return [...this.notices.values()];
  }

  async markSessionNoticeSeen(sessionId: string): Promise<void> {
    this.markNoticeSeen(sessionId);
  }

  async activateTab(id: string): Promise<OpenSessionResult> {
    const session = this.backgroundSessions.get(id);
    if (!session) return this.openSessionId(id);

    if (this.session) this.storeBackgroundSession(this.workspaceCwd, this.session);
    this.backgroundSessions.delete(id);
    this.session = session;
    this.workspaceCwd = sessionWorkspacePath(session, this.workspaceCwd);
    this.setActiveSession(session.sessionManager);
    this.runtimeStateForSession(session).isGenerating = Boolean(session.isStreaming || session.isBashRunning);
    this.shouldCreateSession = false;
    this.persistWorkspace(this.workspaceCwd);
    activateWorkspaceAccess(this.workspaceCwd);
    this.warmWorkspaceSearch();

    return {
      ok: true,
      id,
      turns: this.sessionTurns(session)
    };
  }

  async getRecentSessionsPage(options: RecentSessionsOptions = {}): Promise<RecentSessionsPage> {
    const workspacePath = options.workspacePath ?? this.workspaceCwd;
    const statuses = new Map(this.getTabs().map((tab) => [tab.id, tab.status]));
    return recentSessionsPage({ ...options, workspacePath }, statuses, this.notices, this.liveRecentSessions());
  }

  getStatusItemRecentSessions(limit = 8): StatusItemRecentSession[] {
    return listRecentSessions({ limit }).map((session) => ({
      id: session.id,
      title: session.title,
      workspaceName: workspaceDisplayName(session.cwd)
    }));
  }

  async getWorkspaceFolders(): Promise<WorkspaceFolder[]> {
    const sessions = await SessionManager.listAll();
    const folders = new Map<string, WorkspaceFolder>();
    const attentionStatuses = this.workspaceAttentionStatuses();
    folders.set(this.workspaceCwd, {
      sessionCount: 0,
      path: this.workspaceCwd,
      modified: Date.now(),
      name: workspaceDisplayName(this.workspaceCwd),
      ...this.workspaceAttention(this.workspaceCwd, attentionStatuses)
    });

    const workspaceHistory = this.appState.workspaceHistory ?? {};
    for (const [workspacePath, lastOpenedAt] of Object.entries(workspaceHistory)) {
      if (folders.has(workspacePath)) continue;

      folders.set(workspacePath, {
        sessionCount: 0,
        path: workspacePath,
        modified: lastOpenedAt,
        name: workspaceDisplayName(workspacePath),
        ...this.workspaceAttention(workspacePath, attentionStatuses)
      });
    }

    for (const session of sessions) {
      if (!session.cwd || session.messageCount === 0) continue;

      const current = folders.get(session.cwd);
      const modified = session.modified.getTime();
      if (current) {
        current.modified = Math.max(current.modified, modified);
        current.sessionCount += 1;
        Object.assign(current, this.workspaceAttention(session.cwd, attentionStatuses));
      } else {
        folders.set(session.cwd, {
          modified,
          sessionCount: 1,
          path: session.cwd,
          name: workspaceDisplayName(session.cwd),
          ...this.workspaceAttention(session.cwd, attentionStatuses)
        });
      }
    }

    for (const workspacePath of attentionStatuses.keys()) {
      if (folders.has(workspacePath)) continue;

      folders.set(workspacePath, {
        sessionCount: 0,
        path: workspacePath,
        modified: Date.now(),
        name: workspaceDisplayName(workspacePath),
        ...this.workspaceAttention(workspacePath, attentionStatuses)
      });
    }

    return [...folders.values()].sort((a, b) => b.modified - a.modified);
  }

  async prepareDroppedFiles(paths: string[]): Promise<PreparedDropFiles> {
    const result = await prepareDroppedFileAttachments(paths);
    return {
      pathTokens: result.pathTokens,
      attachments: result.attachments.map((attachment) => this.storeAttachment(attachment))
    };
  }

  async prepareClipboardImage(): Promise<ImageAttachment | null> {
    const attachment = await prepareClipboardImageAttachment();
    return attachment ? this.storeAttachment(attachment) : null;
  }

  releaseAttachments(ids: string[]): void {
    for (const id of ids) {
      this.attachments.delete(id);
    }
  }

  async switchWorkspace(cwd: string): Promise<SwitchWorkspaceResult> {
    const nextCwd = cwd.trim();
    if (!nextCwd) return { ok: false, error: 'Workspace path is empty.' };
    if (nextCwd === this.workspaceCwd) return { ok: true, unchanged: true, status: await this.getStatus() };

    try {
      this.sessionOpenSequence += 1;
      if (this.session) this.storeBackgroundSession(this.workspaceCwd, this.session);
      this.session = this.backgroundSessionForWorkspace(nextCwd);
      if (this.session) this.backgroundSessions.delete(this.session.sessionManager.getSessionId());
      this.attachments.clear();
      this.activeSessionId = this.session?.sessionManager.getSessionId() ?? '';
      if (this.activeSessionId) this.markNoticeSeen(this.activeSessionId);
      if (this.session)
        this.runtimeStateForSession(this.session).isGenerating = Boolean(
          this.session.isStreaming || this.session.isBashRunning
        );
      this.shouldCreateSession = !this.session;
      this.workspaceCwd = nextCwd;
      this.persistWorkspace(this.workspaceCwd);
      activateWorkspaceAccess(this.workspaceCwd);
      this.refreshWorkspaceSearch();

      return { ok: true, status: await this.getStatus() };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Workspace could not be switched.' };
    }
  }

  getWorkspaceCwd(): string {
    return this.workspaceCwd;
  }

  async getAuthProviders(): Promise<ProviderAuthStatus[]> {
    this.refreshAuth();
    const available = this.modelRegistry.getAvailable();
    const openAiModels = available.filter((model) => isProviderModel(model, 'openai'));
    const googleModels = available.filter((model) => isProviderModel(model, 'google'));
    const anthropicModels = available.filter((model) => isProviderModel(model, 'anthropic'));

    return [
      this.providerAuthStatus('openai', 'OpenAI', openAiModels.length > 0),
      this.providerAuthStatus('anthropic', 'Anthropic', anthropicModels.length > 0),
      this.providerAuthStatus('google', 'Google', googleModels.length > 0)
    ];
  }

  async setApiKey(provider: string, apiKey: string): Promise<ProviderAuthStatus[]> {
    const cleanProvider = provider.trim().toLowerCase();
    const cleanApiKey = apiKey.trim();
    if (!cleanProvider || !cleanApiKey) return this.getAuthProviders();

    this.authStorage.set(cleanProvider, { type: 'api_key', key: cleanApiKey });
    this.modelRegistry.refresh();

    return this.getAuthProviders();
  }

  async disconnectProvider(provider: string): Promise<ProviderAuthStatus[]> {
    const cleanProvider = provider.trim().toLowerCase();
    if (!cleanProvider) return this.getAuthProviders();

    for (const slot of providerAuthSlots(cleanProvider)) this.authStorage.remove(slot);
    this.modelRegistry.refresh();

    return this.getAuthProviders();
  }

  async loginSubscription(provider: string, webContents: WebContents): Promise<ProviderLoginResult> {
    const providerId = provider === 'openai' ? 'openai-codex' : provider;
    this.authInputReject?.(new Error('Login restarted.'));
    this.clearSubscriptionAuthInput();

    try {
      await this.authStorage.login(providerId, {
        onAuth: (info) => {
          webContents.send('chat:subscription-auth-update', {
            provider,
            url: info.url,
            instructions: info.instructions,
            message: 'Complete login in your browser, or paste the redirect URL/code below.'
          });
          shell.openExternal(info.url).catch(() => {});
        },
        onDeviceCode: (info) => {
          webContents.send('chat:subscription-auth-update', {
            provider,
            url: info.verificationUri,
            instructions: `Enter code ${info.userCode} after opening the verification page.`,
            message: 'Open the verification page and enter the device code to finish login.'
          });
          shell.openExternal(info.verificationUri).catch(() => {});
        },
        onManualCodeInput: () => this.createSubscriptionAuthInput(),
        onProgress: (progress) => {
          webContents.send('chat:subscription-auth-update', { provider, progress });
        },
        onPrompt: (prompt) => {
          webContents.send('chat:subscription-auth-update', {
            provider,
            message: prompt.message,
            placeholder: prompt.placeholder
          });
          return this.createSubscriptionAuthInput();
        },
        onSelect: async (prompt) => prompt.options[0]?.id
      });

      this.modelRegistry.refresh();

      return { ok: true, providers: await this.getAuthProviders() };
    } catch (error) {
      return {
        ok: false,
        providers: await this.getAuthProviders(),
        error: error instanceof Error ? error.message : 'Subscription login failed.'
      };
    } finally {
      this.clearSubscriptionAuthInput();
    }
  }

  async submitSubscriptionAuthInput(value: string): Promise<void> {
    this.authInputResolve?.(value);
    this.clearSubscriptionAuthInput();
  }

  async cancelSubscriptionLogin(): Promise<void> {
    this.authInputReject?.(new Error('Login cancelled'));
    this.clearSubscriptionAuthInput();
  }

  async selectModel(selectedKey: string): Promise<ChatStatus> {
    if (this.session && this.sessionIsGenerating(this.session)) {
      return {
        ready: false,
        workspacePath: this.workspaceCwd,
        thinkingLevel: this.selectedThinkingLevel,
        error: 'Stop the current response before changing models.'
      };
    }

    this.refreshAuth();
    const model = this.findModelByKey(selectedKey);
    if (!model) {
      return {
        ready: false,
        workspacePath: this.workspaceCwd,
        thinkingLevel: this.selectedThinkingLevel,
        error: 'Selected model is no longer available.'
      };
    }

    const nextModelKey = modelKey(model);
    this.selectedThinkingLevel = clampThinkingLevel(model, this.selectedThinkingLevel);
    if (this.selectedModelKey !== nextModelKey) {
      this.selectedModelKey = nextModelKey;
      this.sessionOpenSequence += 1;
      if (this.session) this.storeBackgroundSession(this.workspaceCwd, this.session);
      this.session = null;
      this.activeSessionId = '';
      this.shouldCreateSession = true;
    }
    this.persistState({ selectedModelKey: nextModelKey, selectedThinkingLevel: this.selectedThinkingLevel });

    return {
      ready: true,
      workspacePath: this.workspaceCwd,
      modelLabel: modelLabel(model),
      selectedModelKey: nextModelKey,
      thinkingLevel: this.selectedThinkingLevel
    };
  }

  async selectThinkingLevel(level: string): Promise<ChatStatus> {
    if (this.session && this.sessionIsGenerating(this.session)) {
      return {
        ready: false,
        workspacePath: this.workspaceCwd,
        thinkingLevel: this.selectedThinkingLevel,
        error: 'Stop the current response before changing thinking level.'
      };
    }
    if (!this.isThinkingLevel(level)) {
      return {
        ready: false,
        workspacePath: this.workspaceCwd,
        thinkingLevel: this.selectedThinkingLevel,
        error: 'Unknown thinking level.'
      };
    }

    this.refreshAuth();
    const model = this.pickModel();
    if (!model) {
      return {
        ready: false,
        workspacePath: this.workspaceCwd,
        thinkingLevel: this.selectedThinkingLevel,
        error: this.modelRegistry.getError() ?? 'No configured models found.'
      };
    }

    this.selectedThinkingLevel = clampThinkingLevel(model, level);
    this.session?.setThinkingLevel(this.selectedThinkingLevel);
    this.persistState({ selectedThinkingLevel: this.selectedThinkingLevel });

    return {
      ready: true,
      workspacePath: this.workspaceCwd,
      modelLabel: modelLabel(model),
      selectedModelKey: modelKey(model),
      thinkingLevel: this.selectedThinkingLevel
    };
  }

  async send(prompt: string, webContents?: WebContents, attachments: ImageAttachment[] = []): Promise<SendResult> {
    if (!prompt.trim()) return { ok: false, error: 'Prompt is empty.' };
    return this.generate(await this.getSession(), this.workspaceCwd, prompt, attachments, webContents);
  }

  private async generate(
    session: AgentSession,
    workspacePath: string,
    prompt: string,
    attachments: ImageAttachment[],
    webContents?: WebContents
  ): Promise<SendResult> {
    const text = prompt.trim();
    if (!text) return { ok: false, error: 'Prompt is empty.' };
    let endError = '';
    const activeSession = session;
    let runtimeState: SessionRuntimeState | null = null;
    let sendAbortSequence = 0;
    let startedGeneration = false;
    let sessionId = '';
    let lastMobileChangeNotifiedAt = 0;
    const notifyMobileSessionChange = (force = false) => {
      const now = Date.now();
      if (!force && now - lastMobileChangeNotifiedAt < mobileStreamNotifyMinIntervalMs) return;

      lastMobileChangeNotifiedAt = now;
      this.notifyMobileSessionChanged(sessionId, workspacePath);
    };

    try {
      sessionId = session.sessionManager.getSessionId();
      runtimeState = this.runtimeStateForSession(session);
      if (runtimeState.isGenerating || session.isStreaming)
        return this.queueFollowUp(text, attachments, session, runtimeState, webContents);
      if (session.isBashRunning) return { ok: false, error: 'A command is already running.' };

      const state = runtimeState;
      state.isGenerating = true;
      startedGeneration = true;
      sendAbortSequence = state.abortSequence;
      const images = await this.resolveAttachments(attachments);
      this.resetLiveAssistantTurn(session, state);
      notifyMobileSessionChange(true);
      const toolArgs = new Map<string, unknown>();
      const unsubscribe = session.subscribe((event) => {
        const active = this.isActiveSession(sessionId, workspacePath);
        if (event.type === 'queue_update') {
          if (active) this.syncQueuedMessages(event.steering, event.followUp, webContents);
          return;
        }

        if (active && event.type === 'message_start' && event.message.role === 'user') {
          this.emitQueuedTurnStart(event.message.content, state, webContents);
        }

        if (event.type === 'tool_execution_start' || event.type === 'tool_execution_update') {
          toolArgs.set(event.toolCallId, event.args);
        }

        let previousToolArgs: unknown;
        if ('toolCallId' in event) previousToolArgs = toolArgs.get(event.toolCallId);
        const eventContext = previousToolArgs ? { toolArgs: previousToolArgs } : {};
        const renderedEvent = chatEvent(event, eventContext);
        if (renderedEvent) this.appendLiveAssistantDetail(state, renderedEvent);
        if (active) this.emitEvent(renderedEvent, webContents);
        if (renderedEvent) this.emitScoped('chat:scoped-event', sessionId, workspacePath, renderedEvent);
        if (event.type === 'tool_execution_end') toolArgs.delete(event.toolCallId);

        const delta = textDelta(event);
        if (delta) this.appendLiveAssistantText(state, delta);
        if (active && delta) this.emit('delta', delta, webContents);
        if (delta) this.emitScoped('chat:scoped-delta', sessionId, workspacePath, delta);

        const thought = thinkingDelta(event);
        if (thought) this.appendLiveAssistantThinking(state, thought);
        if (active && thought) this.emit('thinking-delta', thought, webContents);
        if (thought) this.emitScoped('chat:scoped-thinking-delta', sessionId, workspacePath, thought);
        if (renderedEvent || delta || thought) notifyMobileSessionChange();

        const error = agentEndError(event);
        if (error) endError = error;
      });

      try {
        if (images.length > 0) {
          await session.prompt(text, { images });
        } else {
          await session.prompt(text);
        }
      } finally {
        unsubscribe();
      }

      if (endError) {
        if (shouldCompleteAfterStreamError(state.liveAssistantTurn ?? null, endError)) {
          delete state.liveAssistantTurn;
          if (this.isActiveSession(sessionId, workspacePath)) {
            this.setActiveSession(session.sessionManager);
            this.emit('done', '', webContents);
          } else {
            this.setNotice(sessionId, workspacePath, 'completed', webContents);
          }
          this.emitScoped('chat:scoped-done', sessionId, workspacePath, '');
          return { ok: true, sessionId };
        }

        delete state.liveAssistantTurn;
        if (state.abortSequence !== sendAbortSequence) {
          if (this.isActiveSession(sessionId, workspacePath)) {
            this.setActiveSession(session.sessionManager);
            this.emit('done', '', webContents);
          }
          this.emitScoped('chat:scoped-done', sessionId, workspacePath, '');
          return { ok: true, sessionId };
        }

        if (this.isActiveSession(sessionId, workspacePath)) {
          this.clearQueuedMessages(webContents);
          this.emit('error', endError, webContents);
        } else {
          this.setNotice(sessionId, workspacePath, 'failed', webContents);
        }
        this.emitScoped('chat:scoped-error', sessionId, workspacePath, endError);
        return { ok: false, error: endError };
      }

      if (this.isActiveSession(sessionId, workspacePath)) {
        delete state.liveAssistantTurn;
        this.setActiveSession(session.sessionManager);
        this.emit('done', '', webContents);
      } else {
        delete state.liveAssistantTurn;
        this.setNotice(sessionId, workspacePath, 'completed', webContents);
      }
      this.emitScoped('chat:scoped-done', sessionId, workspacePath, '');
      return { ok: true, sessionId };
    } catch (error) {
      if (runtimeState && runtimeState.abortSequence !== sendAbortSequence) {
        if (this.isActiveSession(sessionId, workspacePath)) {
          this.setActiveSession(activeSession.sessionManager);
          this.emit('done', '', webContents);
        }
        if (sessionId) this.emitScoped('chat:scoped-done', sessionId, workspacePath, '');
        return { ok: true, ...(sessionId ? { sessionId } : {}) };
      }

      const message = error instanceof Error ? error.message : 'Chat failed.';
      if (runtimeState) delete runtimeState.liveAssistantTurn;
      if (this.isActiveSession(sessionId, workspacePath)) {
        this.clearQueuedMessages(webContents);
        this.emit('error', message, webContents);
      } else if (sessionId) {
        this.setNotice(sessionId, workspacePath, 'failed', webContents);
      }
      if (sessionId) this.emitScoped('chat:scoped-error', sessionId, workspacePath, message);
      return { ok: false, error: message };
    } finally {
      if (runtimeState && startedGeneration) {
        runtimeState.isGenerating = false;
        notifyMobileSessionChange(true);
      }
    }
  }

  async command(command: string, excludeFromContext: boolean, webContents: WebContents): Promise<CommandResult> {
    const text = command.trim();
    if (!text) return { ok: false, error: 'Command is empty.' };
    let runtimeState: SessionRuntimeState | null = null;

    try {
      const session = await this.getSession();
      runtimeState = this.runtimeStateForSession(session);
      if (runtimeState.isGenerating || session.isStreaming)
        return { ok: false, error: 'A response is already running.' };
      if (session.isBashRunning) return { ok: false, error: 'A command is already running.' };

      runtimeState.isGenerating = true;

      const result = await session.executeBash(
        text,
        (chunk) => {
          webContents.send('chat:command-delta', chunk);
        },
        { excludeFromContext }
      );
      const output = result.output ?? '';

      this.setActiveSession(session.sessionManager);
      webContents.send('chat:command-done', output ? 'done' : '');
      return {
        ok: true,
        ...(this.activeSessionId ? { sessionId: this.activeSessionId } : {}),
        ...(typeof result.exitCode === 'number' ? { exitCode: result.exitCode } : {})
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Command failed.';
      return { ok: false, error: message };
    } finally {
      if (runtimeState) runtimeState.isGenerating = false;
    }
  }

  async steerQueuedMessage(id: string, webContents: WebContents): Promise<QueuedMessage[]> {
    const session = this.session;
    const runtimeState = session ? this.runtimeStateForSession(session) : null;
    const message = runtimeState?.queuedMessages.find((item) => item.id === id);
    if (!session || !runtimeState || !message) return this.visibleQueuedMessages();

    const canSteerQueuedMessage = runtimeState.isGenerating && session.isStreaming;
    if (!canSteerQueuedMessage) return this.visibleQueuedMessages();

    runtimeState.queuedMessages = runtimeState.queuedMessages.map((item) =>
      item.id === id ? { ...item, kind: 'steer' } : item
    );
    await this.rebuildSessionQueue(session, runtimeState);
    this.emitQueueUpdate(webContents);
    return this.visibleQueuedMessages(runtimeState);
  }

  async deleteQueuedMessage(id: string, webContents: WebContents): Promise<QueuedMessage[]> {
    const session = this.session;
    const runtimeState = session ? this.runtimeStateForSession(session) : null;
    const nextMessages = (runtimeState?.queuedMessages ?? []).filter((message) => message.id !== id);
    if (!runtimeState || nextMessages.length === runtimeState.queuedMessages.length)
      return this.visibleQueuedMessages();

    runtimeState.queuedMessages = nextMessages;
    if (session) await this.rebuildSessionQueue(session, runtimeState);
    this.emitQueueUpdate(webContents);
    return this.visibleQueuedMessages(runtimeState);
  }

  async abort(webContents?: WebContents): Promise<void> {
    const runtimeState = this.activeRuntimeState();
    if (runtimeState) runtimeState.abortSequence += 1;
    this.clearQueuedMessages(webContents, runtimeState);
    this.session?.abortBash();
    await this.session?.abort();
  }

  async newSession(): Promise<void> {
    this.sessionOpenSequence += 1;
    const previousSession = this.session;
    if (previousSession) {
      const runtimeState = this.runtimeStateForSession(previousSession);
      runtimeState.queueRebuildDepth += 1;
      try {
        previousSession.clearQueue();
      } finally {
        runtimeState.queueRebuildDepth = Math.max(0, runtimeState.queueRebuildDepth - 1);
      }
      this.clearQueuedMessageState(runtimeState);
      this.storeBackgroundSession(this.workspaceCwd, previousSession);
    }
    this.session = null;
    this.attachments.clear();
    this.activeSessionId = '';
    this.shouldCreateSession = true;
  }

  dispose(): void {
    this.sessionOpenSequence += 1;
    this.authInputReject?.(new Error('Chat service disposed.'));
    this.clearSubscriptionAuthInput();
    this.session?.dispose();
    this.session = null;
    for (const session of this.backgroundSessions.values()) session.dispose();
    this.liveTitles.clear();
    this.backgroundSessions.clear();
    this.sessionRuntimeStates.clear();
    this.attachments.clear();
    disposeWorkspaceFinders();
    closeStartDb();
  }

  private runtimeStateForSessionId(sessionId: string): SessionRuntimeState {
    const current = this.sessionRuntimeStates.get(sessionId);
    if (current) return current;

    const state = createSessionRuntimeState();
    this.sessionRuntimeStates.set(sessionId, state);
    return state;
  }

  private runtimeStateForSession(session: AgentSession): SessionRuntimeState {
    return this.runtimeStateForSessionId(session.sessionManager.getSessionId());
  }

  private warmWorkspaceSearch(): void {
    warmWorkspaceFinder(this.workspaceCwd);
  }

  private refreshWorkspaceSearch(): void {
    refreshWorkspaceFinder(this.workspaceCwd).catch(() => {});
  }

  private activeRuntimeState(): SessionRuntimeState | null {
    return this.session ? this.runtimeStateForSession(this.session) : null;
  }

  private sessionIsGenerating(session: AgentSession): boolean {
    return Boolean(this.runtimeStateForSession(session).isGenerating || session.isStreaming || session.isBashRunning);
  }

  workInProgress(): boolean {
    if (this.session && this.sessionIsGenerating(this.session)) return true;
    return [...this.backgroundSessions.values()].some((session) => this.sessionIsGenerating(session));
  }

  private deleteRuntimeState(sessionId: string): void {
    this.liveTitles.delete(sessionId);
    this.sessionRuntimeStates.delete(sessionId);
  }

  private cleanupAttachments(): void {
    const cutoff = Date.now() - attachmentMaxAgeMs;
    for (const [id, attachment] of this.attachments) {
      if (attachment.createdAt < cutoff) this.attachments.delete(id);
    }
  }

  private storeAttachment(attachment: PreparedImageAttachment): ImageAttachment {
    this.cleanupAttachments();
    this.attachments.set(attachment.id, {
      data: attachment.data,
      createdAt: Date.now(),
      mimeType: attachment.mimeType
    });
    return stripAttachmentData(attachment);
  }

  private async resolveAttachments(attachments: ImageAttachment[]): Promise<SessionImageAttachment[]> {
    this.cleanupAttachments();
    const images: SessionImageAttachment[] = [];

    for (const attachment of attachments) {
      const stored = this.attachments.get(attachment.id);
      this.attachments.delete(attachment.id);
      if (stored) {
        images.push({ type: 'image', data: stored.data, mimeType: stored.mimeType });
        continue;
      }

      const recovered = await prepareDroppedFileAttachments([attachment.path]);
      const image = recovered.attachments[0];
      if (image) images.push({ type: 'image', data: image.data, mimeType: image.mimeType });
    }

    return images;
  }

  private visibleQueuedMessages(runtimeState = this.activeRuntimeState()): QueuedMessage[] {
    return (runtimeState?.queuedMessages ?? []).map(visibleQueuedMessage);
  }

  private emitQueueUpdate(webContents?: WebContents): void {
    if (!webContents) return;

    const messages = this.visibleQueuedMessages();
    const signature = `${this.activeSessionId}:${JSON.stringify(messages)}`;
    if (this.queueUpdateSignatures.get(webContents) === signature) return;

    this.queueUpdateSignatures.set(webContents, signature);
    webContents.send('chat:queue-update', messages);
  }

  private consumeQueuedMessageText(messages: string[], message: QueuedMessage): boolean {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (!this.queuedMessageMatches(message, messages[index] ?? '')) continue;

      messages.splice(index, 1);
      return true;
    }

    return false;
  }

  private syncQueuedMessages(
    steering: readonly string[],
    followUp: readonly string[],
    webContents?: WebContents
  ): void {
    const runtimeState = this.activeRuntimeState();
    if (!runtimeState || runtimeState.queueRebuildDepth > 0) return;

    const steeringMessages = [...steering];
    const followUpMessages = [...followUp];
    const nextMessages: PendingQueuedMessage[] = [];
    const deliveredMessages: PendingQueuedMessage[] = [];

    for (const message of [...runtimeState.queuedMessages].reverse()) {
      if (message.kind === 'steer' && this.consumeQueuedMessageText(steeringMessages, message)) {
        nextMessages.push(message);
      } else if (message.kind === 'followUp' && this.consumeQueuedMessageText(followUpMessages, message)) {
        nextMessages.push(message);
      } else if (this.consumeQueuedMessageText(steeringMessages, message)) {
        nextMessages.push({ ...message, kind: 'steer' });
      } else if (this.consumeQueuedMessageText(followUpMessages, message)) {
        nextMessages.push({ ...message, kind: 'followUp' });
      } else {
        deliveredMessages.push(message);
      }
    }

    nextMessages.reverse();
    deliveredMessages.reverse();
    for (const text of steeringMessages) nextMessages.push({ id: randomUUID(), kind: 'steer', text });
    for (const text of followUpMessages) nextMessages.push({ id: randomUUID(), kind: 'followUp', text });

    runtimeState.queueDeliveryCandidates.push(...deliveredMessages.map(visibleQueuedMessage));
    runtimeState.queuedMessages = nextMessages;
    this.emitQueueUpdate(webContents);
  }

  private async queueFollowUp(
    text: string,
    attachments: ImageAttachment[],
    session: AgentSession,
    runtimeState: SessionRuntimeState,
    webContents?: WebContents
  ): Promise<SendResult> {
    if (!session.isStreaming) return { ok: false, error: 'The response is still starting.' };

    const id = randomUUID();

    try {
      const images = await this.resolveAttachments(attachments);
      const message: PendingQueuedMessage = {
        id,
        kind: 'followUp',
        text,
        ...(images.length > 0 ? { images } : {})
      };
      runtimeState.queuedMessages.push(message);
      this.emitQueueUpdate(webContents);
      if (images.length > 0) {
        await session.followUp(text, images);
      } else {
        await session.followUp(text);
      }
      return { ok: true, queued: true, ...(this.activeSessionId ? { sessionId: this.activeSessionId } : {}) };
    } catch (error) {
      runtimeState.queuedMessages = runtimeState.queuedMessages.filter((message) => message.id !== id);
      this.emitQueueUpdate(webContents);
      return { ok: false, error: error instanceof Error ? error.message : 'Message could not be queued.' };
    }
  }

  private async rebuildSessionQueue(session: AgentSession, runtimeState: SessionRuntimeState): Promise<void> {
    runtimeState.queueRebuildDepth += 1;
    try {
      session.clearQueue();
      for (const message of runtimeState.queuedMessages) {
        if (message.kind === 'steer') {
          await session.steer(message.text, message.images);
        } else {
          await session.followUp(message.text, message.images);
        }
      }
    } finally {
      runtimeState.queueRebuildDepth = Math.max(0, runtimeState.queueRebuildDepth - 1);
    }
  }

  private clearQueuedMessages(webContents?: WebContents, runtimeState = this.activeRuntimeState()): void {
    if (this.session) {
      const state = runtimeState ?? this.runtimeStateForSession(this.session);
      state.queueRebuildDepth += 1;
      try {
        this.session.clearQueue();
      } finally {
        state.queueRebuildDepth = Math.max(0, state.queueRebuildDepth - 1);
      }
    }

    this.clearQueuedMessageState(runtimeState);
    if (webContents) this.emitQueueUpdate(webContents);
  }

  private clearQueuedMessageState(runtimeState = this.activeRuntimeState()): void {
    if (!runtimeState) return;

    runtimeState.queuedMessages = [];
    runtimeState.queueDeliveryCandidates = [];
  }

  private queuedMessageMatches(message: QueuedMessage, text: string): boolean {
    return message.text === text || text.startsWith(`${message.text}\n[image`);
  }

  private emitQueuedTurnStart(content: unknown, runtimeState: SessionRuntimeState, webContents?: WebContents): void {
    if (!webContents) return;

    const text = textContent(content);
    const index = runtimeState.queueDeliveryCandidates.findIndex((message) => this.queuedMessageMatches(message, text));
    if (index === -1) return;

    const [message] = runtimeState.queueDeliveryCandidates.splice(index, 1);
    if (!message) return;

    const attachments = imageAttachments(content, message.id);
    webContents.send('chat:queued-turn-start', {
      id: message.id,
      text: message.text,
      ...(attachments.length ? { attachments } : {})
    });
  }

  private sessionIsReportable(session: AgentSession | null): boolean {
    return Boolean(
      session && (session.sessionManager.getEntries().length || session.isStreaming || session.isBashRunning)
    );
  }

  private reportableActiveSessionId(): string {
    if (!this.activeSessionId || !this.sessionIsReportable(this.session)) return '';
    return this.activeSessionId;
  }

  private setActiveSession(sessionManager: SessionManager): void {
    this.activeSessionId = sessionManager.getSessionId();
    this.activeSessionByWorkspace.set(this.workspaceCwd, this.activeSessionId);
  }

  private notifyMobileSessionChanged(sessionId: string, workspacePath: string): void {
    if (!sessionId || !workspacePath) return;
    this.mobileSessionChangeHandler({ sessionId, workspacePath });
  }

  private subscribeIndexSync(session: AgentSession, modelProvider: string, modelId: string): void {
    const sessionManager = session.sessionManager;
    if (!sessionManager.isPersisted()) return;
    const sessionId = sessionManager.getSessionId();
    const path = sessionManager.getSessionFile();
    if (!path) return;

    const cwd = sessionManager.getCwd();
    const initialThinkingLevel = this.selectedThinkingLevel;
    let inserted = false;

    const ensureRow = () => {
      if (inserted) return;
      upsertSessionOnStart({
        path,
        cwd,
        modelId,
        appVersion,
        modelProvider,
        id: sessionId,
        thinkingLevel: initialThinkingLevel
      });
      inserted = true;
    };

    const notifyChanged = () => {
      sendToRendererWindows('chat:recent-sessions-changed', { workspacePath: cwd });
      this.notifyMobileSessionChanged(sessionId, cwd);
    };

    session.subscribe((event) => {
      if (event.type === 'turn_end') {
        ensureRow();
        const entries = sessionManager.getEntries();
        const usage = getLastAssistantUsage(entries);
        const firstMessage = firstUserMessageText(entries);
        updateSessionOnTurnEnd(sessionId, {
          inputTokens: usage?.input ?? 0,
          outputTokens: usage?.output ?? 0,
          ...(firstMessage ? { firstMessage } : {})
        });
        notifyChanged();
        return;
      }
      if (event.type === 'session_info_changed' && event.name) {
        ensureRow();
        updateSessionTitle(sessionId, event.name);
        notifyChanged();
        return;
      }
      if (event.type === 'thinking_level_changed') {
        ensureRow();
        updateSessionThinkingLevel(sessionId, event.level);
        notifyChanged();
      }
    });
  }

  private storeBackgroundSession(workspacePath: string, session: AgentSession): void {
    const sessionId = session.sessionManager.getSessionId();
    if (!this.sessionIsReportable(session)) {
      session.dispose();
      this.deleteRuntimeState(sessionId);
      this.deleteSubagentNameAllocator(sessionId);
      this.deleteWorkspaceSessionReferences(sessionId);
      return;
    }

    this.backgroundSessions.set(sessionId, session);
    this.activeSessionByWorkspace.set(workspacePath, sessionId);
  }

  private parkSupersededSession(session: AgentSession): void {
    if (!this.sessionIsReportable(session)) {
      session.dispose();
      return;
    }
    this.backgroundSessions.set(session.sessionManager.getSessionId(), session);
  }

  private sessionTurns(session: AgentSession): HistoryTurn[] {
    const turns = historyTurns(session.sessionManager.getEntries());
    if (!session.isStreaming) return turns;
    const liveTurn = this.runtimeStateForSession(session).liveAssistantTurn;
    if (!liveTurn) return turns;
    return appendLiveAssistantTurn(turns, liveAssistantHistoryTurn(liveTurn));
  }

  private mobileSessionTurns(sessionId: string, path: string): HistoryTurn[] {
    if (this.session?.sessionManager.getSessionId() === sessionId) return this.sessionTurns(this.session);

    const session = this.backgroundSessions.get(sessionId);
    if (session) return this.sessionTurns(session);

    return historyTurns(SessionManager.open(path).getEntries());
  }

  private resetLiveAssistantTurn(session: AgentSession, runtimeState = this.runtimeStateForSession(session)): void {
    runtimeState.liveAssistantTurn = liveAssistantPlaceholder(session);
  }

  private appendLiveAssistantText(runtimeState: SessionRuntimeState | null, delta: string): void {
    const turn = runtimeState?.liveAssistantTurn;
    if (turn) turn.text += delta;
  }

  private appendLiveAssistantThinking(runtimeState: SessionRuntimeState | null, delta: string): void {
    const turn = runtimeState?.liveAssistantTurn;
    if (turn) turn.thinking += delta;
  }

  private appendLiveAssistantDetail(runtimeState: SessionRuntimeState | null, event: ChatEvent): void {
    const turn = runtimeState?.liveAssistantTurn;
    if (!turn) return;

    turn.details = [...(turn.details ?? []), historyDetail(event, turn.details?.length ?? 0, turn.id, Date.now())];
  }

  private deleteWorkspaceSessionReferences(sessionId: string): void {
    for (const [workspacePath, activeSessionId] of this.activeSessionByWorkspace) {
      if (activeSessionId === sessionId) this.activeSessionByWorkspace.delete(workspacePath);
    }
  }

  private backgroundSessionForWorkspace(workspacePath: string): AgentSession | null {
    const preferredSessionId = this.activeSessionByWorkspace.get(workspacePath);
    if (preferredSessionId) {
      const preferredSession = this.backgroundSessions.get(preferredSessionId);
      if (preferredSession) return preferredSession;
    }

    for (const session of this.backgroundSessions.values()) {
      if ((session.sessionManager.getCwd() || workspacePath) === workspacePath) return session;
    }

    return null;
  }

  private isActiveSession(sessionId: string, workspacePath: string): boolean {
    return Boolean(sessionId && this.activeSessionId === sessionId && this.workspaceCwd === workspacePath);
  }

  private markNoticeSeen(sessionId: string): void {
    if (!this.notices.delete(sessionId)) return;
    this.persistNotices();
  }

  private setNotice(
    sessionId: string,
    workspacePath: string,
    kind: SessionNotice['kind'],
    webContents?: WebContents
  ): void {
    this.notices.set(sessionId, {
      kind,
      sessionId,
      workspacePath,
      createdAt: Date.now()
    });
    this.persistNotices();
    webContents?.send('chat:recent-sessions-changed', { workspacePath });
    webContents?.send('chat:notice', { tabId: sessionId, payload: this.notices.get(sessionId), workspacePath });
  }

  private persistNotices(): void {
    this.persistState({ sessionNotices: Object.fromEntries(this.notices) });
  }

  private topAttentionStatus(statuses: AgentTabStatus[]): AgentTabStatus | undefined {
    if (statuses.includes('failed')) return 'failed';
    if (statuses.includes('generating')) return 'generating';
    if (statuses.includes('completed')) return 'completed';
    return;
  }

  private workspaceAttention(
    workspacePath: string,
    attentionStatuses = this.workspaceAttentionStatuses()
  ): Pick<WorkspaceFolder, 'noticeKind' | 'status'> {
    const status = attentionStatuses.get(workspacePath);

    return {
      ...(status ? { status } : {}),
      ...(status === 'completed' || status === 'failed' ? { noticeKind: status } : {})
    };
  }

  private workspaceAttentionStatuses(): Map<string, AgentTabStatus> {
    const statuses = new Map<string, AgentTabStatus[]>();
    const addStatus = (workspacePath: string, status: AgentTabStatus) => {
      if (status === 'idle') return;
      statuses.set(workspacePath, [...(statuses.get(workspacePath) ?? []), status]);
    };

    for (const tab of this.getTabs()) addStatus(tab.workspacePath, tab.status);
    for (const notice of this.notices.values()) addStatus(notice.workspacePath, notice.kind);

    return new Map(
      [...statuses.entries()].flatMap(([workspacePath, statuses]) => {
        const status = this.topAttentionStatus(statuses);
        return status ? [[workspacePath, status]] : [];
      })
    );
  }

  private async getSession(): Promise<AgentSession> {
    if (this.session) return this.session;

    this.refreshAuth();
    const model = this.pickModel();
    if (!model) {
      throw new Error(this.modelRegistry.getError() ?? 'No configured models found.');
    }

    const cwd = this.workspaceCwd;
    const sessionManager = this.shouldCreateSession ? SessionManager.create(cwd) : SessionManager.continueRecent(cwd);
    const resourceLoader = await createStartResourceLoader(cwd);
    const { session } = await createAgentSession({
      cwd,
      model,
      sessionManager,
      resourceLoader,
      authStorage: this.authStorage,
      modelRegistry: this.modelRegistry,
      customTools: createStartCustomTools(this.subagentToolsOptions(sessionManager.getSessionId(), cwd)),
      settingsManager: this.settingsManager,
      thinkingLevel: this.selectedThinkingLevel
    });
    enableRegisteredTools(session);
    this.subscribeIndexSync(session, model.provider, model.id);

    this.shouldCreateSession = false;

    this.session = session;
    this.setActiveSession(sessionManager);
    return session;
  }

  private subagentToolsOptions(sessionId: string, cwd: string): Parameters<typeof createStartCustomTools>[0] {
    const allocator = this.subagentNameAllocator(sessionId);

    return {
      cwd: () => cwd,
      authStorage: this.authStorage,
      sessions: this.sessionController(),
      worktreeOwners: (path) => this.worktreeOwners(path),
      nameAllocator: () => allocator,
      modelRegistry: this.modelRegistry,
      model: () => this.pickModel() ?? null,
      settingsManager: this.settingsManager,
      thinkingLevel: () => this.selectedThinkingLevel,
      customTools: () =>
        createStartCustomTools({
          cwd: () => cwd,
          includeSubagents: false,
          authStorage: this.authStorage,
          nameAllocator: () => allocator,
          modelRegistry: this.modelRegistry,
          model: () => this.pickModel() ?? null,
          settingsManager: this.settingsManager,
          customTools: () => createStartCustomTools(),
          thinkingLevel: () => this.selectedThinkingLevel
        })
    };
  }

  private sessionController(): SessionController {
    const toSummary = (tab: AgentTab) => ({
      id: tab.id,
      status: tab.status,
      workspacePath: tab.workspacePath,
      isolated: isManagedWorktree(baseDir, tab.workspacePath)
    });

    return {
      list: () => this.getTabs().map(toSummary),
      read: (id) => {
        const tab = this.getTabs().find((entry) => entry.id === id);
        if (!tab) return null;
        return this.mobileSessionTurns(id, tab.workspacePath).map((turn) => ({ role: turn.role, text: turn.text }));
      },
      send: (id, prompt) => {
        const session = this.activeSessionId === id ? this.session : this.backgroundSessions.get(id);
        if (!session) return;
        this.generate(session, sessionWorkspacePath(session, this.workspaceCwd), prompt, []).catch(() => {});
      },
      create: (input) => this.startSession(input)
    };
  }

  private worktreeOwners(path: string): WorktreeOwner[] {
    return listSessionsByCwd(path, { archived: false, limit: 10, offset: 0 }).map((record) => ({
      id: record.id,
      title: record.title,
      active: record.id === this.activeSessionId
    }));
  }

  async startSession({
    prompt,
    environment
  }: {
    prompt: string;
    environment: SessionEnvironment;
  }): Promise<SessionSummary> {
    const worktreePath =
      environment.type === 'worktree' ? await this.addManagedWorktree(environment.branch, environment.base) : '';
    const workspacePath = worktreePath || this.workspaceCwd;
    const session = await this.createBackgroundSession(workspacePath);
    this.generate(session, workspacePath, prompt, []).catch(() => {});
    return {
      workspacePath,
      status: 'generating',
      id: session.sessionManager.getSessionId(),
      isolated: isManagedWorktree(baseDir, workspacePath)
    };
  }

  private subagentNameAllocator(sessionId: string): SubagentNameAllocator {
    const current = this.subagentNameAllocators.get(sessionId);
    if (current) return current;

    const allocator = new SubagentNameAllocator();
    this.subagentNameAllocators.set(sessionId, allocator);
    return allocator;
  }

  private deleteSubagentNameAllocator(sessionId: string): void {
    this.subagentNameAllocators.delete(sessionId);
  }

  private refreshAuth(): void {
    this.authStorage.reload();
    this.modelRegistry.refresh();
  }

  private clearSubscriptionAuthInput(): void {
    this.authInputReject = null;
    this.authInputResolve = null;
  }

  private createSubscriptionAuthInput(): Promise<string> {
    this.authInputReject?.(new Error('Login prompt was replaced.'));

    return new Promise<string>((resolve, reject) => {
      this.authInputReject = reject;
      this.authInputResolve = resolve;
    });
  }

  private pickModel() {
    const available = this.getPickerModels();
    let selected: ReturnType<typeof this.findModelByKey>;
    if (this.selectedModelKey) selected = this.findModelByKey(this.selectedModelKey);
    if (selected) return selected;

    const model = available[0];

    this.selectedModelKey = model ? modelKey(model) : null;
    if (model) this.selectedThinkingLevel = clampThinkingLevel(model, this.selectedThinkingLevel);
    this.persistState({
      selectedThinkingLevel: this.selectedThinkingLevel,
      ...(this.selectedModelKey ? { selectedModelKey: this.selectedModelKey } : {})
    });
    return model;
  }

  private workspaceHistoryFor(workspacePath: string): Record<string, number> {
    const workspaceHistory = this.appState.workspaceHistory ?? {};
    return workspaceHistoryWith(workspaceHistory, workspacePath);
  }

  private persistWorkspace(workspacePath: string): void {
    if (isManagedWorktree(baseDir, workspacePath)) return;
    this.persistState({
      lastWorkspace: workspacePath,
      workspaceHistory: this.workspaceHistoryFor(workspacePath)
    });
  }

  private persistState(patch: Partial<StartState>): void {
    this.appState = updateStartState(patch);
  }

  private getPickerModels() {
    return getVisibleModels(this.modelRegistry.getAvailable());
  }

  private isThinkingLevel(level: string): level is EffortLevel {
    return effortLevels.includes(level as EffortLevel);
  }

  private findModelByKey(selectedModelKey: string) {
    return this.modelRegistry.getAvailable().find((model) => modelKey(model) === selectedModelKey);
  }

  private providerAuthStatus(key: ProviderKey, name: string, hasModels: boolean): ProviderAuthStatus {
    const apiKeyStatus = this.authStorage.getAuthStatus(key);
    const hasApiKey = apiKeyStatus.configured;
    const supportsSubscription = key === 'anthropic' || key === 'openai';
    const subscriptionProvider = key === 'openai' ? 'openai-codex' : key;
    const hasSubscription =
      supportsSubscription &&
      (this.authStorage.get(subscriptionProvider)?.type === 'oauth' ||
        this.authStorage.getAuthStatus(subscriptionProvider).configured);
    const hasCredentials = hasApiKey || hasSubscription;
    const kind = providerAuthKind(hasModels, hasSubscription, hasApiKey);

    return {
      key,
      name,
      kind,
      connected: hasModels,
      hasCredentials,
      label: providerAuthLabel(kind, hasCredentials)
    };
  }

  private emit(event: 'delta' | 'done' | 'error' | 'thinking-delta', payload: string, webContents?: WebContents): void {
    if (!webContents) return;

    webContents.send(`chat:${event}`, payload);
  }

  private emitEvent(event: ReturnType<typeof chatEvent>, webContents?: WebContents): void {
    if (!webContents || !event) return;
    webContents.send('chat:event', event);
  }

  private emitScoped<T>(channel: string, tabId: string, workspacePath: string, payload: T): void {
    if (!tabId) return;
    sendToRendererWindows(channel, { tabId, workspacePath, payload });
  }
}
