type SettingsScope = 'global' | 'project';

export class InMemorySettingsBackend {
  private readonly store = new Map<SettingsScope, string>();

  withLock(scope: SettingsScope, fn: (current: string | undefined) => string | undefined): void {
    const next = fn(this.store.get(scope));
    if (next === undefined) {
      this.store.delete(scope);
      return;
    }
    this.store.set(scope, next);
  }
}
