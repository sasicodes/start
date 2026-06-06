import { randomUUID } from 'node:crypto';
import type { FakeAuthStorage, FakeModelRegistry } from './auth.js';
import type { FakeSessionManager } from './session-manager.js';
import type { FakeModel } from './state.js';
import { sessionRegistry } from './state.js';

interface FakeTool {
  name: string;
}

export type FakeAgentSessionEvent =
  | { type: 'message_start'; message: { role: 'user' | 'assistant'; content: unknown } }
  | { type: 'queue_update'; steering: readonly string[]; followUp: readonly string[] }
  | { type: 'tool_execution_start'; toolCallId: string; toolName: string; args: unknown }
  | { type: 'tool_execution_update'; toolCallId: string; toolName: string; args: unknown; partialResult: unknown }
  | { type: 'tool_execution_end'; toolCallId: string; toolName: string; result: unknown; isError?: boolean }
  | {
      type: 'message_update';
      assistantMessageEvent: { type: 'text_delta'; delta: string } | { type: 'thinking_delta'; delta: string };
    }
  | { type: 'agent_end'; messages: { errorMessage?: string }[] };

type Listener = (event: FakeAgentSessionEvent) => void;

export interface CreateAgentSessionOptions {
  cwd: string;
  model: FakeModel;
  thinkingLevel: string;
  authStorage: FakeAuthStorage;
  customTools?: FakeTool[];
  modelRegistry: FakeModelRegistry;
  sessionManager: FakeSessionManager;
}

export class FakeAgentSession {
  readonly sessionManager: FakeSessionManager;
  readonly extensionRunner = {
    getRegisteredCommands: () => [] as never[]
  };
  readonly promptTemplates: never[] = [];
  readonly resourceLoader = {
    getSkills: () => ({ skills: [] as never[] })
  };

  isStreaming = false;
  isBashRunning = false;
  disposed = false;
  reloadCount = 0;
  thinkingLevel = 'medium';

  followUpQueue: string[] = [];
  steerQueue: string[] = [];
  followUpImages: unknown[] = [];
  steerImages: unknown[] = [];

  private readonly listeners = new Set<Listener>();
  private readonly tools: FakeTool[];
  private activeToolNames: string[] = [];

  private promptResolve: (() => void) | null = null;
  private promptReject: ((error: Error) => void) | null = null;
  private promptCalledResolve: (() => void) | null = null;
  private promptCalledWaiter: Promise<void> | null = null;

  constructor(options: CreateAgentSessionOptions) {
    this.sessionManager = options.sessionManager;
    this.thinkingLevel = options.thinkingLevel;
    this.tools = [{ name: 'fake-tool' }, ...(options.customTools ?? [])];
    sessionRegistry.set(options.sessionManager.getSessionId(), this);
  }

  getAllTools() {
    return this.tools;
  }

  setActiveToolsByName(names: string[]) {
    this.activeToolNames = names;
  }

  getActiveToolNames() {
    return this.activeToolNames;
  }

  get messages() {
    return [];
  }

  getLastAssistantText() {
    return '';
  }

  setThinkingLevel(level: string) {
    this.thinkingLevel = level;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  pushEvent(event: FakeAgentSessionEvent) {
    for (const listener of this.listeners) listener(event);
  }

  async prompt(text: string, _options?: { images?: unknown }): Promise<void> {
    this.isStreaming = true;
    this.sessionManager.appendEntry({
      id: `user:${randomUUID()}`,
      type: 'message',
      timestamp: new Date().toISOString(),
      message: { role: 'user', content: text }
    });
    this.promptCalledResolve?.();
    this.promptCalledResolve = null;
    this.promptCalledWaiter = null;
    return new Promise<void>((resolve, reject) => {
      this.promptResolve = resolve;
      this.promptReject = reject;
    });
  }

  awaitPromptCall(): Promise<void> {
    if (this.isStreaming) return Promise.resolve();
    if (!this.promptCalledWaiter) {
      this.promptCalledWaiter = new Promise<void>((resolve) => {
        this.promptCalledResolve = resolve;
      });
    }
    return this.promptCalledWaiter;
  }

  finishPrompt(events: FakeAgentSessionEvent[] = []) {
    for (const event of events) this.pushEvent(event);
    this.pushEvent({ type: 'agent_end', messages: [] });
    this.isStreaming = false;
    const resolver = this.promptResolve;
    this.promptResolve = null;
    this.promptReject = null;
    resolver?.();
  }

  failPrompt(errorMessage: string) {
    this.pushEvent({ type: 'agent_end', messages: [{ errorMessage }] });
    this.isStreaming = false;
    const resolver = this.promptResolve;
    this.promptResolve = null;
    this.promptReject = null;
    resolver?.();
  }

  abortPromptWith(error: Error) {
    this.isStreaming = false;
    const reject = this.promptReject;
    this.promptResolve = null;
    this.promptReject = null;
    reject?.(error);
  }

  async followUp(text: string, images?: unknown) {
    this.followUpImages.push(images);
    this.followUpQueue.push(this.queuedText(text, images));
    this.pushEvent({ type: 'queue_update', steering: this.steerQueue, followUp: this.followUpQueue });
  }

  async steer(text: string, images?: unknown) {
    this.steerImages.push(images);
    this.steerQueue.push(this.queuedText(text, images));
    this.pushEvent({ type: 'queue_update', steering: this.steerQueue, followUp: this.followUpQueue });
  }

  clearQueue() {
    this.followUpQueue = [];
    this.steerQueue = [];
    this.followUpImages = [];
    this.steerImages = [];
    this.pushEvent({ type: 'queue_update', steering: [], followUp: [] });
  }

  private queuedText(text: string, images: unknown) {
    const count = Array.isArray(images) ? images.length : 0;
    return count > 0 ? `${text}\n[image ${count}]` : text;
  }

  async executeBash(_command: string, _chunk: (chunk: string) => void, _options: unknown) {
    return { output: '', exitCode: 0 };
  }

  async abort() {
    this.abortPromptWith(new Error('aborted'));
  }

  async reload() {
    this.reloadCount += 1;
  }

  abortBash() {
    this.isBashRunning = false;
  }

  dispose() {
    this.disposed = true;
    this.listeners.clear();
    sessionRegistry.delete(this.sessionManager.getSessionId());
  }
}
