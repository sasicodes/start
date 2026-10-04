import { useChatEvents } from '@renderer/shared/chat/events';
import { readTurns, replaceTurns, updateTurns } from '@renderer/state/chat';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const lifecycle = vi.hoisted(() => ({ cleanups: [] as (() => void)[] }));

vi.mock('preact/hooks', () => ({
  useRef: <T>(current: T) => ({ current }),
  useCallback: <T>(callback: T) => callback,
  useEffect: (setup: () => () => void) => lifecycle.cleanups.push(setup())
}));
vi.mock('@renderer/shared/app-focus', () => ({ useAppFocusChange: () => {} }));
vi.mock('@renderer/shared/turn/scroll', () => ({ scrollTurnToStart: () => {} }));
vi.mock('@renderer/ui/sounds', () => ({ playDoneSound: () => {}, playErrorSound: () => {} }));

const listeners = new Map<string, (payload: unknown) => void>();
const emit = (name: string, payload: unknown) => listeners.get(name)?.(payload);
const register = new Proxy(
  {},
  {
    get: (_target, name: string) => (callback: (payload: unknown) => void) => {
      listeners.set(name, callback);
      return () => listeners.delete(name);
    }
  }
);

const setup = (id: string) => {
  replaceTurns([{ id, text: '', role: 'assistant', createdAt: 1, streaming: true }]);
  const options: Parameters<typeof useChatEvents>[0] = {
    workspacePath: '/tmp/a',
    activeSessionId: 'a',
    assistantIdRef: { current: id },
    terminalIdRef: { current: null },
    sessionRequestRef: { current: 1 },
    textareaRef: { current: null },
    onShowChat: () => {},
    clearSession: () => {},
    setIsGenerating: () => {},
    setQueuedMessages: () => {},
    onShowSettings: () => {},
    setTurns: updateTurns,
    syncStatus: async () => {},
    loadModels: async () => {},
    loadAuthProviders: async () => {},
    onOpenSession: async () => true
  };
  useChatEvents(options);
  return options;
};

const event = { key: 'tool:1', title: 'Running command', kind: 'tool', state: 'active' };

describe('chat event routing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { pi: { chat: register, app: register }, setTimeout, clearTimeout });
  });
  afterEach(() => {
    for (const cleanup of lifecycle.cleanups.splice(0)) cleanup();
    listeners.clear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('separates assistant messages at tool boundaries even without trailing punctuation', () => {
    setup('live');
    emit('onDelta', 'A started');
    emit('onEvent', event);
    emit('onDelta', 'A checkpoint');
    vi.runAllTimers();

    expect(readTurns().map((turn) => turn.text)).toEqual(['A started', 'A checkpoint']);
    expect(readTurns()[1]?.details).toHaveLength(1);
  });

  it('keeps restored chats on scoped events after starting a new activity segment', () => {
    const options = setup('streaming:a');
    emit('onScopedDelta', { tabId: 'a', payload: 'A started.' });
    emit('onScopedEvent', { tabId: 'a', payload: event });
    emit('onScopedThinkingDelta', { tabId: 'a', payload: 'A thought.' });
    emit('onScopedDelta', { tabId: 'a', payload: 'A checkpoint.' });
    emit('onDelta', 'wrong unscoped text');
    vi.runAllTimers();

    expect(options.assistantIdRef.current).toMatch(/^streaming:/u);
    expect(readTurns().map((turn) => turn.text)).toEqual(['A started.', 'A checkpoint.']);
    expect(readTurns()[1]?.thinking).toBe('A thought.');
    emit('onScopedDone', { tabId: 'a', payload: 'completed' });
    expect(options.assistantIdRef.current).toBeNull();
  });

  it('drops buffered and late events from another chat during rapid switches', () => {
    const options = setup('streaming:a');
    emit('onScopedDelta', { tabId: 'a', payload: 'stale A' });
    options.activeSessionId = 'b';
    options.sessionRequestRef.current += 1;
    options.assistantIdRef.current = 'streaming:b';
    replaceTurns([{ id: 'streaming:b', text: '', role: 'assistant', createdAt: 2, streaming: true }]);
    emit('onScopedDelta', { tabId: 'a', payload: 'late A' });
    emit('onScopedThinkingDelta', { tabId: 'a', payload: 'late thought' });
    emit('onScopedEvent', { tabId: 'a', payload: event });
    emit('onScopedDelta', { tabId: 'b', payload: 'current B' });
    vi.runAllTimers();

    expect(readTurns()).toEqual([
      { id: 'streaming:b', text: 'current B', role: 'assistant', createdAt: 2, streaming: true }
    ]);
  });
});
