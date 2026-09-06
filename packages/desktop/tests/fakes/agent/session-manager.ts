import { randomUUID } from 'node:crypto';
import { sessionManagerRegistry, sessionStore } from './state.js';

export class FakeSessionManager {
  private static counter = 0;
  private readonly id: string;
  private readonly cwd: string;
  private readonly entries: unknown[] = [];

  constructor(cwd: string, id?: string) {
    FakeSessionManager.counter += 1;
    this.id = id ?? `sess-${FakeSessionManager.counter}-${randomUUID().slice(0, 8)}`;
    this.cwd = cwd;
    sessionManagerRegistry.set(this.id, this);
    sessionStore.set(this.id, this);
  }

  static create(cwd: string) {
    return new FakeSessionManager(cwd);
  }

  static inMemory(cwd: string) {
    return new FakeSessionManager(cwd);
  }

  static continueRecent(cwd: string) {
    for (const manager of sessionStore.values()) {
      if (manager.cwd === cwd) return manager;
    }
    return new FakeSessionManager(cwd);
  }

  static open(path: string) {
    for (const manager of sessionStore.values()) {
      if (manager.id === path || manager.cwd === path) return manager;
    }
    return new FakeSessionManager(path);
  }

  static async listAll() {
    return [...sessionStore.values()].map((manager) => manager.info());
  }

  static async list(cwd: string) {
    return [...sessionStore.values()].filter((manager) => manager.cwd === cwd).map((manager) => manager.info());
  }

  private info() {
    return {
      id: this.id,
      cwd: this.cwd,
      path: this.id,
      modified: new Date(),
      messageCount: this.entries.length
    };
  }

  getSessionId() {
    return this.id;
  }

  getCwd() {
    return this.cwd;
  }

  getEntries(): unknown[] {
    return [...this.entries];
  }

  getBranch(): unknown[] {
    return this.getEntries();
  }

  appendCustomEntry(customType: string, data: unknown): string {
    const id = `custom:${randomUUID()}`;
    this.appendEntry({ id, type: 'custom', customType, data, timestamp: new Date().toISOString() });
    return id;
  }

  getSessionFile(): string | undefined {
    return this.id;
  }

  isPersisted(): boolean {
    return true;
  }

  appendEntry(entry: unknown) {
    this.entries.push(entry);
  }

  appendModelChange(provider: string, modelId: string) {
    this.appendEntry({
      provider,
      modelId,
      id: `model:${randomUUID()}`,
      type: 'model_change',
      timestamp: new Date().toISOString()
    });
  }
}
