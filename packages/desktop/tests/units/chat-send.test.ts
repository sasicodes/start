import type { SendResult } from '@preload/index';
import { useChatSend } from '@renderer/shared/chat/send';
import { afterEach, expect, it, vi } from 'vitest';
import { deferred } from '../helpers/deferred.js';

vi.mock('preact/hooks', () => ({ useCallback: <T>(callback: T) => callback }));

afterEach(() => vi.unstubAllGlobals());

const setup = (isGenerating: boolean) => {
  const selection = deferred<void>();
  const response = deferred<SendResult>();
  const send = vi.fn(() => response.promise);
  vi.stubGlobal('window', { pi: { chat: { send } } });
  const sessionRequestRef = { current: 0 };
  const setTurns = vi.fn();
  const updateActiveSessionId = vi.fn();
  const chat = useChatSend({
    draft: '',
    setTurns,
    isGenerating,
    sessionRequestRef,
    updateActiveSessionId,
    setDraft: vi.fn(),
    setIsGenerating: vi.fn(),
    setLoadedSessionId: vi.fn(),
    waitForSelection: () => selection.promise,
    terminalIdRef: { current: null },
    assistantIdRef: { current: null }
  });
  return { chat, send, response, selection, setTurns, sessionRequestRef, updateActiveSessionId };
};

it.each([false, true])(
  'does not send into a different session after awaiting selection (generating: %s)',
  async (generating) => {
    const state = setup(generating);
    const sending = state.chat.sendText('original session prompt');
    expect(state.send).not.toHaveBeenCalled();
    state.sessionRequestRef.current += 1;
    state.selection.resolve();
    await sending;
    expect(state.send).not.toHaveBeenCalled();
  }
);

it.each([false, true])(
  'sends once after selection settles in the same session (generating: %s)',
  async (generating) => {
    const state = setup(generating);
    const sending = state.chat.sendText('same session prompt');
    expect(state.send).not.toHaveBeenCalled();
    state.selection.resolve();
    await Promise.resolve();
    expect(state.send).toHaveBeenCalledExactlyOnceWith('same session prompt', []);
    state.response.resolve({ ok: true, sessionId: 'original' });
    await sending;
    expect(state.updateActiveSessionId).toHaveBeenCalledWith('original');
  }
);

it.each(['failure', 'rejection'])('ignores a queued-send %s after switching sessions', async (result) => {
  const state = setup(true);
  const sending = state.chat.sendText('queued prompt');
  state.selection.resolve();
  await Promise.resolve();
  state.sessionRequestRef.current += 1;
  if (result === 'failure') state.response.resolve({ ok: false, sessionId: 'original', error: 'failed' });
  else state.response.reject(new Error('failed'));
  await sending;
  expect(state.setTurns).not.toHaveBeenCalled();
  expect(state.updateActiveSessionId).not.toHaveBeenCalled();
});
