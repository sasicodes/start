import './environment.js';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  type AgentSession,
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager
} from '@earendil-works/pi-coding-agent';
import { chatEvent } from '@main/events';
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
  textDelta
} from '@main/helpers';
import {
  type ChatStatus,
  type CommandResult,
  type EffortLevel,
  effortLevels,
  enabledTools,
  type HistoryMessage,
  type ModelOption,
  type OpenSessionResult,
  type ProviderAuthStatus,
  type ProviderLoginResult,
  type RecentSession,
  type SendResult,
  type WorkspaceFolder
} from '@main/types';
import { shell, type WebContents } from 'electron';

export class ChatService {
  private readonly authStorage = AuthStorage.create();
  private readonly modelRegistry = ModelRegistry.create(this.authStorage);
  private session: AgentSession | null = null;
  private isGenerating = false;
  private activeSessionId: string | undefined;
  private shouldCreateSession = false;
  private selectedModelKey: string | null = null;
  private authInputReject: ((error: Error) => void) | null = null;
  private authInputResolve: ((value: string) => void) | null = null;
  private selectedThinkingLevel: EffortLevel = 'medium';

  async getStatus(): Promise<ChatStatus> {
    this.refreshAuth();
    const model = this.pickModel();

    if (!model) {
      return {
        ready: false,
        error:
          this.modelRegistry.getError() ??
          'No configured Pi models found. Run pi login or configure ~/.pi/agent/auth.json.'
      };
    }

    return {
      ready: true,
      modelLabel: modelLabel(model),
      selectedModelKey: modelKey(model),
      ...(this.activeSessionId ? { sessionId: this.activeSessionId } : {}),
      thinkingLevel: this.selectedThinkingLevel
    };
  }

  async getModels(): Promise<{
    models: ModelOption[];
    selectedModelKey: string | undefined;
    error: string | undefined;
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

    return {
      models,
      selectedModelKey: selected ? modelKey(selected) : undefined,
      error: models.length === 0 ? this.modelRegistry.getError() : undefined
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
      this.shouldCreateSession = false;
      return {
        ok: true,
        id: sessionManager.getSessionId(),
        messages: this.historyMessages(sessionManager.getEntries())
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Session could not be opened.' };
    }
  }

  async getRecentSessions(): Promise<RecentSession[]> {
    const sessions = await SessionManager.list(process.cwd());

    return Promise.all(
      sessions
        .sort((a, b) => b.modified.getTime() - a.modified.getTime())
        .map(async (session) => ({
          id: session.id,
          path: session.path,
          modified: session.modified.getTime(),
          messageCount: await this.userMessageCount(session.path),
          title: session.name || session.firstMessage || 'Untitled session'
        }))
    );
  }

  async getWorkspaceFolders(): Promise<WorkspaceFolder[]> {
    const sessions = await SessionManager.listAll();
    const folders = new Map<string, WorkspaceFolder>();

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
          void shell.openExternal(info.url);
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
    if (this.isGenerating) return { ready: false, error: 'Stop the current response before changing models.' };

    this.refreshAuth();
    const model = this.findModelByKey(selectedKey);
    if (!model) return { ready: false, error: 'Selected model is no longer available.' };

    const nextModelKey = modelKey(model);
    this.selectedThinkingLevel = clampThinkingLevel(model, this.selectedThinkingLevel);
    if (this.selectedModelKey !== nextModelKey) {
      this.selectedModelKey = nextModelKey;
      this.session?.dispose();
      this.session = null;
    }

    return {
      ready: true,
      modelLabel: modelLabel(model),
      selectedModelKey: nextModelKey,
      thinkingLevel: this.selectedThinkingLevel
    };
  }

  async selectThinkingLevel(level: string): Promise<ChatStatus> {
    if (this.isGenerating) return { ready: false, error: 'Stop the current response before changing thinking level.' };
    if (!this.isThinkingLevel(level)) return { ready: false, error: 'Unknown thinking level.' };

    this.refreshAuth();
    const model = this.pickModel();
    if (!model) return { ready: false, error: this.modelRegistry.getError() ?? 'No configured Pi models found.' };

    this.selectedThinkingLevel = clampThinkingLevel(model, level);
    this.session?.setThinkingLevel(this.selectedThinkingLevel);

    return {
      ready: true,
      modelLabel: modelLabel(model),
      selectedModelKey: modelKey(model),
      thinkingLevel: this.selectedThinkingLevel
    };
  }

  async send(prompt: string, webContents: WebContents): Promise<SendResult> {
    const text = prompt.trim();
    if (!text) return { ok: false, error: 'Prompt is empty.' };
    if (this.isGenerating) return { ok: false, error: 'A Pi response is already running.' };

    this.isGenerating = true;
    let assistantText = '';
    let endError: string | undefined;

    try {
      const session = await this.getSession();
      const unsubscribe = session.subscribe((event) => {
        this.emitEvent(webContents, chatEvent(event));

        const delta = textDelta(event);
        if (delta) {
          assistantText += delta;
          this.emit(webContents, 'delta', delta);
        }

        const error = agentEndError(event);
        if (error) endError = error;
      });

      try {
        await session.prompt(text);
      } finally {
        unsubscribe();
      }

      if (endError) {
        this.emit(webContents, 'error', endError);
        return { ok: false, error: endError };
      }

      this.setActiveSession(session.sessionManager);
      this.emit(webContents, 'done', assistantText);
      return { ok: true, text: assistantText, sessionId: this.activeSessionId };
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
      webContents.send('chat:command-done', output);
      return { ok: true, output, sessionId: this.activeSessionId, exitCode: result.exitCode };
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
    this.activeSessionId = undefined;
    this.isGenerating = false;
    this.shouldCreateSession = true;
  }

  dispose(): void {
    this.session?.dispose();
    this.session = null;
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

    const cwd = process.cwd();
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

  private async userMessageCount(path: string): Promise<number> {
    try {
      const content = await readFile(path, 'utf8');
      return content
        .split('\n')
        .filter((line) => line.trim())
        .reduce((count, line) => {
          try {
            const entry = JSON.parse(line) as { type?: string; message?: { role?: string } };
            return entry.type === 'message' && entry.message?.role === 'user' ? count + 1 : count;
          } catch {
            return count;
          }
        }, 0);
    } catch {
      return 0;
    }
  }

  private historyMessages(entries: ReturnType<ReturnType<typeof SessionManager.open>['getBranch']>): HistoryMessage[] {
    return entries.flatMap((entry) => {
      if (entry.type !== 'message') return [];

      const role = entry.message.role;
      if (role !== 'user' && role !== 'assistant') return [];

      const text = this.messageText(entry.message.content);
      if (!text) return [];

      return [
        {
          role,
          text,
          id: entry.id,
          createdAt: new Date(entry.timestamp).getTime()
        }
      ];
    });
  }

  private messageText(content: unknown): string {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';

    return content
      .flatMap((part) => {
        if (!part || typeof part !== 'object') return [];
        const value = 'text' in part ? part.text : undefined;
        return typeof value === 'string' ? [value] : [];
      })
      .join('\n')
      .trim();
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
    return new Promise<string>((resolve, reject) => {
      this.authInputReject = reject;
      this.authInputResolve = resolve;
    });
  }

  private pickModel() {
    const available = this.getPickerModels();
    const selected = this.selectedModelKey ? this.findModelByKey(this.selectedModelKey) : undefined;
    if (selected) return selected;

    const model = available[0];

    this.selectedModelKey = model ? modelKey(model) : null;
    if (model) this.selectedThinkingLevel = clampThinkingLevel(model, this.selectedThinkingLevel);
    return model;
  }

  private getPickerModels() {
    return getVisibleModels(this.modelRegistry.getAvailable());
  }

  private isThinkingLevel(level: string): level is EffortLevel {
    return effortLevels.includes(level as EffortLevel);
  }

  private findModelByKey(selectedModelKey: string) {
    return this.modelRegistry.getAvailable().find((model) => modelKey(model) === selectedModelKey) ?? undefined;
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

  private emit(webContents: WebContents, event: 'delta' | 'done' | 'error', payload: string): void {
    webContents.send(`chat:${event}`, payload);
  }

  private emitEvent(webContents: WebContents, event: { name: string }): void {
    webContents.send('chat:event', event);
  }
}
