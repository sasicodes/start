import { describe, expect, it } from 'vitest';
import { InMemorySettingsBackend } from '@main/pi/settings';

describe('InMemorySettingsBackend', () => {
  it('returns undefined to the first reader', () => {
    const backend = new InMemorySettingsBackend();
    let observed: string | undefined = 'initial-non-empty';
    backend.withLock('global', (current) => {
      observed = current;
      return;
    });
    expect(observed).toBeUndefined();
  });

  it('persists a value across calls within the same instance', () => {
    const backend = new InMemorySettingsBackend();
    backend.withLock('global', () => '{"theme":"dark"}');
    let observed: string | undefined;
    backend.withLock('global', (current) => {
      observed = current;
      return;
    });
    expect(observed).toBe('{"theme":"dark"}');
  });

  it('clears the value when the callback returns undefined explicitly', () => {
    const backend = new InMemorySettingsBackend();
    backend.withLock('global', () => 'first');
    backend.withLock('global', () => undefined);
    let observed: string | undefined = 'should-be-cleared';
    backend.withLock('global', (current) => {
      observed = current;
      return;
    });
    expect(observed).toBeUndefined();
  });

  it('isolates global and project scopes', () => {
    const backend = new InMemorySettingsBackend();
    backend.withLock('global', () => 'g');
    backend.withLock('project', () => 'p');

    let globalValue: string | undefined;
    let projectValue: string | undefined;
    backend.withLock('global', (current) => {
      globalValue = current;
      return;
    });
    backend.withLock('project', (current) => {
      projectValue = current;
      return;
    });

    expect(globalValue).toBe('g');
    expect(projectValue).toBe('p');
  });
});
