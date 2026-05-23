import '@main/environment';

import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import {
  type AgentSession,
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager
} from '@earendil-works/pi-coding-agent';
import { chatEvent } from '@main/events';
import { historyTurns } from '@main/history';
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
  textDelta,
  thinkingDelta
} from '@main/helpers';
import {
  type PreparedImageAttachment,
  prepareClipboardImage as prepareClipboardImageAttachment,
  prepareDroppedFiles as prepareDroppedFileAttachments,
  stripAttachmentData
} from '@main/attachments';
import { readStartState, type StartState, updateStartState } from '@main/storage';
import { activateWorkspaceAccess } from '@main/workspace/access';
import {
  type ChatStatus,
  type CommandResult,
  type EffortLevel,
  effortLevels,
  enabledTools,
  type ImageAttachment,
  type ModelOption,
  type OpenSessionResult,
  type PreparedDropFiles,
  type ProviderAuthStatus,
  type ProviderLoginResult,
  type RecentSession,
  type SendResult,
  type SwitchWorkspaceResult,
  type WorkspaceFolder
} from '@main/types';
import { shell, type WebContents } from 'electron';

const maxRecentSessions = 40;
const attachmentMaxAgeMs = 15 * 60 * 1000;

export class ChatService {
  private appState = readStartState();
  private readonly authStorage = AuthStorage.create();
  private readonly modelRegistry = ModelRegistry.create(this.authStorage);
  private session: AgentSession | null = null;
  private isGenerating = false;
  private readonly attachments = new Map<string, { createdAt: number; data: string; mimeType: string }>();
  private activeSessionId: string | undefined;
  private shouldCreateSession = true;
  private selectedModelKey: string | null = this.appState.selectedModelKey ?? null;
  private workspaceCwd = this.appState.lastWorkspace ?? process.cwd();
  private authInputReject: ((error: Error) => void) | null = null;
  private authInputResolve: ((value: string) => void) | null = null;
  private selectedThinkingLevel: EffortLevel = this.appState.selectedThinkingLevel;

  async getStatus(): Promise<ChatStatus> {
    this.refreshAuth();
    const model = this.pickModel();

    if (!model) {
      return {
        ready: false,
        workspacePath: this.workspaceCwd,
        thinkingLevel: this.selectedThinkingLevel,
        error:
          this.modelRegistry.getError() ??
          'No configured Pi models found. Run pi login or configure ~/.pi/agent/auth.json.'
      };
    }

    return {
      ready: true,
      workspacePath: this.workspaceCwd,
      modelLabel: modelLabel(model),
      selectedModelKey: modelKey(model),
      ...(this.activeSessionId ? { sessionId: this.activeSessionId } : {}),
      thinkingLevel: this.selectedThinkingLevel
    };
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

  async openSession(path: string): Promise<OpenSessionResult> {
    if (this.isGenerating) return { ok: false, error: 'Stop the current response before opening a session.' };

    try {
      this.refreshAuth();
      const model = this.pickModel();
      if (!model) return { ok: false, error: this.modelRegistry.getError() ?? 'No configured Pi models found.' };

      const sessionManager = SessionManager.open(path);
      this.session?.dispose();
      const { session } = await createAgentSession({
        cwd: sessionManager.getCwd() || process.cwd(),
        model,
        tools: enabledTools,
        authStorage: this.authStorage,
        modelRegistry: this.modelRegistry,
        thinkingLevel: this.selectedThinkingLevel,
        sessionManager
      });

      this.session = session;
      this.setActiveSession(sessionManager);
      this.workspaceCwd = sessionManager.getCwd() || this.workspaceCwd;
      this.persistState({ lastWorkspace: this.workspaceCwd });
      activateWorkspaceAccess(this.workspaceCwd);
      this.shouldCreateSession = false;
      return {
        ok: true,
        id: sessionManager.getSessionId(),
        turns: historyTurns(sessionManager.getEntries())
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Session could not be opened.' };
    }
  }

  async openSessionId(sessionId: string): Promise<OpenSessionResult> {
    const id = sessionId.trim();
    if (!id) return { ok: false, error: 'Session id is empty.' };

    const sessions = await SessionManager.listAll();
    const session = sessions.find((entry) => entry.id === id);
    if (!session) return { ok: false, error: 'Session could not be found.' };

    return this.openSession(session.path);
  }

  async getRecentSessions(cwd = this.workspaceCwd): Promise<RecentSession[]> {
    const sessions = await SessionManager.list(cwd);
    const uniqueSessions = new Map<string, (typeof sessions)[number]>();

    for (const session of sessions) {
      uniqueSessions.set(session.id, session);
    }

    const recentSessions = [...uniqueSessions.values()]
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
      .slice(0, maxRecentSessions);

    return Promise.all(
      recentSessions.map(async (session) => ({
        id: session.id,
        path: session.path,
        modified: session.modified.getTime(),
        turnCount: await this.userTurnCount(session.path),
        title: session.name || session.firstMessage || 'Untitled session'
      }))
    );
  }

  async getWorkspaceFolders(): Promise<WorkspaceFolder[]> {
    const sessions = await SessionManager.listAll();
    const folders = new Map<string, WorkspaceFolder>();
    folders.set(this.workspaceCwd, {
      modified: Date.now(),
      path: this.workspaceCwd,
      sessionCount: 0,
      name: path.basename(this.workspaceCwd) || this.workspaceCwd
    });

    for (const session of sessions) {
      if (!session.cwd) continue;

      const current = folders.get(session.cwd);
      const modified = session.modified.getTime();
      if (current) {
        current.modified = Math.max(current.modified, modified);
        current.sessionCount += 1;
      } else {
        folders.set(session.cwd, {
          modified,
          path: session.cwd,
          sessionCount: 1,
          name: path.basename(session.cwd) || session.cwd
        });
      }
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
    if (this.isGenerating) return { ok: false, error: 'Stop the current response before switching workspaces.' };

    try {
      this.session?.abortBash();
      await this.session?.abort();
      this.session?.dispose();
      this.session = null;
      this.attachments.clear();
      this.activeSessionId = undefined;
      this.shouldCreateSession = true;
      this.workspaceCwd = nextCwd;
      this.persistState({ lastWorkspace: this.workspaceCwd });
      activateWorkspaceAccess(this.workspaceCwd);

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
    const anthropicModels = available.filter((model) => isProviderModel(model, 'anthropic'));

    return [
      this.providerAuthStatus('openai', 'OpenAI', openAiModels.length > 0),
      this.providerAuthStatus('anthropic', 'Anthropic', anthropicModels.length > 0)
    ];
  }

  async setRuntimeApiKey(provider: string, apiKey: string): Promise<ProviderAuthStatus[]> {
    const cleanProvider = provider.trim().toLowerCase();
    const cleanApiKey = apiKey.trim();
    if (!cleanProvider || !cleanApiKey) return this.getAuthProviders();

    this.authStorage.setRuntimeApiKey(cleanProvider, cleanApiKey);
    this.modelRegistry.refresh();
    this.session?.dispose();
    this.session = null;

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
          void shell.openExternal(info.url).catch(() => {});
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
      this.session?.dispose();
      this.session = null;

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
    if (this.isGenerating) {
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
      this.session?.dispose();
      this.session = null;
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
    if (this.isGenerating) {
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
        error: this.modelRegistry.getError() ?? 'No configured Pi models found.'
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

  async send(prompt: string, webContents: WebContents, attachments: ImageAttachment[] = []): Promise<SendResult> {
    const text = prompt.trim();
    if (!text) return { ok: false, error: 'Prompt is empty.' };
    if (this.isGenerating) return { ok: false, error: 'A Pi response is already running.' };

    this.isGenerating = true;
    let endError: string | undefined;

    try {
      const images = await this.resolveAttachments(attachments);
      const session = await this.getSession();
      const toolArgs = new Map<string, unknown>();
      const unsubscribe = session.subscribe((event) => {
        if (event.type === 'tool_execution_start' || event.type === 'tool_execution_update') {
          toolArgs.set(event.toolCallId, event.args);
        }

        let previousToolArgs: unknown;
        if ('toolCallId' in event) previousToolArgs = toolArgs.get(event.toolCallId);
        const eventContext = previousToolArgs ? { toolArgs: previousToolArgs } : {};
        this.emitEvent(webContents, chatEvent(event, eventContext));
        if (event.type === 'tool_execution_end') toolArgs.delete(event.toolCallId);

        const delta = textDelta(event);
        if (delta) this.emit(webContents, 'delta', delta);

        const thought = thinkingDelta(event);
        if (thought) this.emit(webContents, 'thinking-delta', thought);

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
        this.emit(webContents, 'error', endError);
        return { ok: false, error: endError };
      }

      this.setActiveSession(session.sessionManager);
      this.emit(webContents, 'done', '');
      return { ok: true, ...(this.activeSessionId ? { sessionId: this.activeSessionId } : {}) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chat failed.';
      this.emit(webContents, 'error', message);
      return { ok: false, error: message };
    } finally {
      this.isGenerating = false;
    }
  }

  async command(command: string, excludeFromContext: boolean, webContents: WebContents): Promise<CommandResult> {
    const text = command.trim();
    if (!text) return { ok: false, error: 'Command is empty.' };
    if (this.isGenerating) return { ok: false, error: 'A Pi response is already running.' };

    this.isGenerating = true;

    try {
      const session = await this.getSession();
      if (session.isBashRunning) return { ok: false, error: 'A command is already running.' };

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
      this.isGenerating = false;
    }
  }

  async abort(): Promise<void> {
    this.session?.abortBash();
    await this.session?.abort();
  }

  async newSession(): Promise<void> {
    this.session?.abortBash();
    await this.session?.abort();
    this.session?.dispose();
    this.session = null;
    this.attachments.clear();
    this.activeSessionId = undefined;
    this.isGenerating = false;
    this.shouldCreateSession = true;
  }

  dispose(): void {
    this.authInputReject?.(new Error('Chat service disposed.'));
    this.clearSubscriptionAuthInput();
    this.session?.dispose();
    this.session = null;
    this.attachments.clear();
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

  private async resolveAttachments(attachments: ImageAttachment[]) {
    this.cleanupAttachments();
    const images: { type: 'image'; data: string; mimeType: string }[] = [];

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

  private setActiveSession(sessionManager: SessionManager): void {
    this.activeSessionId = sessionManager.getSessionId();
  }

  private async getSession(): Promise<AgentSession> {
    if (this.session) return this.session;

    this.refreshAuth();
    const model = this.pickModel();
    if (!model) {
      throw new Error(this.modelRegistry.getError() ?? 'No configured Pi models found.');
    }

    const cwd = this.workspaceCwd;
    const sessionManager = this.shouldCreateSession ? SessionManager.create(cwd) : SessionManager.continueRecent(cwd);
    const { session } = await createAgentSession({
      cwd,
      model,
      tools: enabledTools,
      authStorage: this.authStorage,
      modelRegistry: this.modelRegistry,
      thinkingLevel: this.selectedThinkingLevel,
      sessionManager
    });

    this.shouldCreateSession = false;

    this.session = session;
    this.setActiveSession(sessionManager);
    return session;
  }

  private async userTurnCount(path: string): Promise<number> {
    const lines = createInterface({
      input: createReadStream(path, { encoding: 'utf8' }),
      crlfDelay: Number.POSITIVE_INFINITY
    });
    let count = 0;

    try {
      for await (const line of lines) {
        if (!line.trim()) continue;

        try {
          const entry = JSON.parse(line) as { type?: string; message?: { role?: string } };
          if (entry.type === 'message' && entry.message?.role === 'user') count += 1;
        } catch {}
      }
    } catch {
      return 0;
    }

    return count;
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

  private providerAuthStatus(key: 'anthropic' | 'openai', name: string, hasModels: boolean): ProviderAuthStatus {
    const subscriptionProvider = key === 'openai' ? 'openai-codex' : key;
    const subscriptionCredential = this.authStorage.get(subscriptionProvider);
    const subscriptionStatus = this.authStorage.getAuthStatus(subscriptionProvider);
    const apiKeyStatus = this.authStorage.getAuthStatus(key);
    const hasApiKey = apiKeyStatus.configured;
    const hasSubscription = subscriptionCredential?.type === 'oauth' || subscriptionStatus.configured;
    const kind = providerAuthKind(hasModels, hasSubscription, hasApiKey);

    return {
      key,
      name,
      kind,
      connected: hasModels,
      label: providerAuthLabel(kind, hasSubscription || hasApiKey)
    };
  }

  private emit(webContents: WebContents, event: 'delta' | 'done' | 'error' | 'thinking-delta', payload: string): void {
    webContents.send(`chat:${event}`, payload);
  }

  private emitEvent(webContents: WebContents, event: ReturnType<typeof chatEvent>): void {
    if (!event) return;
    webContents.send('chat:event', event);
  }
}
