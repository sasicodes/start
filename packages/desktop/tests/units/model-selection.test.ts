import type { ChatStatus } from '@preload/index';
import { createModelSelection } from '@renderer/shared/models/selection';
import { expect, it, vi } from 'vitest';
import { deferred } from '../helpers/deferred.js';

const setup = () => {
  let selected = 'old';
  const requests: ReturnType<typeof deferred<ChatStatus>>[] = [];
  const select = vi.fn(() => {
    const request = deferred<ChatStatus>();
    requests.push(request);
    return request.promise;
  });
  const thinkingRequests: ReturnType<typeof deferred<ChatStatus>>[] = [];
  const selectThinking = vi.fn(() => {
    const request = deferred<ChatStatus>();
    thinkingRequests.push(request);
    return request.promise;
  });
  const onThinkingLevel = vi.fn();
  const controller = createModelSelection({
    select,
    selectThinking,
    onThinkingLevel,
    thinkingLevel: 'medium',
    read: () => selected,
    write: (key) => {
      selected = key;
    }
  });
  return { select, requests, controller, selectThinking, thinkingRequests, onThinkingLevel, selected: () => selected };
};

const success = (key: string): ChatStatus => ({ ready: true, workspacePath: '', selectedModelKey: key });

it('updates immediately and sends one request for repeated activation', async () => {
  const state = setup();
  const saving = state.controller.select('new');
  expect(state.selected()).toBe('new');
  state.controller.select('new');
  expect(state.select).toHaveBeenCalledTimes(1);
  state.requests[0]?.resolve(success('new'));
  await saving;
  expect(state.selected()).toBe('new');
});

it('serializes changes and keeps the latest click visible while older requests finish', async () => {
  const state = setup();
  const saving = state.controller.select('first');
  state.controller.select('second');
  state.controller.select('last');
  expect(state.selected()).toBe('last');
  state.requests[0]?.resolve(success('first'));
  await Promise.resolve();
  expect(state.select.mock.calls).toHaveLength(2);
  expect(state.selected()).toBe('last');
  state.requests[1]?.resolve(success('last'));
  await saving;
  expect(state.selected()).toBe('last');
});

it('ignores stale refreshes during and after a selection', async () => {
  const state = setup();
  const version = state.controller.version();
  const saving = state.controller.select('new');
  const pendingVersion = state.controller.version();
  state.controller.sync('old', pendingVersion);
  expect(state.selected()).toBe('new');
  state.requests[0]?.resolve(success('new'));
  await saving;
  state.controller.sync('old', version);
  state.controller.sync('old', pendingVersion);
  expect(state.selected()).toBe('new');
  state.controller.sync('external', state.controller.version());
  expect(state.selected()).toBe('external');
});

it.each(['rejected', 'unavailable'])('restores the confirmed selection when the latest request is %s', async (kind) => {
  const state = setup();
  const saving = state.controller.select('first');
  state.controller.select('last');
  state.requests[0]?.resolve(success('first'));
  await Promise.resolve();
  if (kind === 'rejected') state.requests[1]?.reject(new Error('failed'));
  else state.requests[1]?.resolve({ ready: false, workspacePath: '' });
  await saving;
  expect(state.selected()).toBe('first');
});

it('does not restore an old selection after changing sessions', async () => {
  const state = setup();
  const saving = state.controller.select('new');
  state.controller.reset('session-model');
  state.requests[0]?.resolve({ ...success('new'), thinkingLevel: 'high' });
  await saving;
  expect(state.selected()).toBe('session-model');
  expect(state.onThinkingLevel).not.toHaveBeenCalled();
});

it('waits for the latest queued selection before allowing a message to send', async () => {
  const state = setup();
  state.controller.select('first');
  state.controller.select('last');
  const send = vi.fn();
  const sending = state.controller.settle().then(send);
  state.requests[0]?.resolve(success('first'));
  await Promise.resolve();
  expect(send).not.toHaveBeenCalled();
  state.requests[1]?.resolve(success('last'));
  await sending;
  expect(send).toHaveBeenCalledTimes(1);
  expect(state.selected()).toBe('last');
});

it('updates effort immediately and serializes rapid effort changes', async () => {
  const state = setup();
  const saving = state.controller.selectThinking('high');
  expect(state.onThinkingLevel).toHaveBeenLastCalledWith('high');
  state.controller.selectThinking('xhigh');
  state.controller.selectThinking('low');
  expect(state.onThinkingLevel).toHaveBeenLastCalledWith('low');
  expect(state.selectThinking).toHaveBeenCalledTimes(1);
  state.thinkingRequests[0]?.resolve({ ...success('old'), thinkingLevel: 'high' });
  await Promise.resolve();
  expect(state.onThinkingLevel).toHaveBeenLastCalledWith('low');
  expect(state.selectThinking).toHaveBeenLastCalledWith('low');
  state.thinkingRequests[1]?.resolve({ ...success('old'), thinkingLevel: 'low' });
  await saving;
  expect(state.onThinkingLevel).toHaveBeenLastCalledWith('low');
});

it('waits for model and effort changes together before sending', async () => {
  const state = setup();
  state.controller.select('new');
  state.controller.selectThinking('xhigh');
  const send = vi.fn();
  const sending = state.controller.settle().then(send);
  expect(state.selectThinking).not.toHaveBeenCalled();
  state.requests[0]?.resolve({ ...success('new'), thinkingLevel: 'medium' });
  await Promise.resolve();
  expect(state.onThinkingLevel).toHaveBeenLastCalledWith('xhigh');
  expect(state.selectThinking).toHaveBeenCalledWith('xhigh');
  expect(send).not.toHaveBeenCalled();
  state.thinkingRequests[0]?.resolve({ ...success('new'), thinkingLevel: 'xhigh' });
  await sending;
  expect(send).toHaveBeenCalledOnce();
  expect(state.selected()).toBe('new');
  expect(state.onThinkingLevel).toHaveBeenLastCalledWith('xhigh');
});

it('ignores stale effort refreshes and restores confirmed effort after a failed change', async () => {
  const state = setup();
  const version = state.controller.version();
  const saving = state.controller.selectThinking('high');
  state.controller.sync('old', version, 'low');
  expect(state.onThinkingLevel).toHaveBeenLastCalledWith('high');
  state.thinkingRequests[0]?.reject(new Error('failed'));
  await saving;
  state.controller.sync('old', version, 'low');
  expect(state.onThinkingLevel).toHaveBeenLastCalledWith('medium');
  state.controller.sync('external', state.controller.version(), 'xhigh');
  expect(state.onThinkingLevel).toHaveBeenLastCalledWith('xhigh');
});

it('drops queued effort and ignores acknowledgments after switching sessions', async () => {
  const state = setup();
  const saving = state.controller.selectThinking('high');
  state.controller.select('queued');
  state.controller.reset('session-model', 'low');
  state.thinkingRequests[0]?.resolve({ ...success('old'), thinkingLevel: 'high' });
  await saving;
  expect(state.select).not.toHaveBeenCalled();
  expect(state.selected()).toBe('session-model');
  expect(state.onThinkingLevel).toHaveBeenLastCalledWith('low');
});
