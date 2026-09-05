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
  const onThinkingLevel = vi.fn();
  const controller = createModelSelection({
    select,
    onThinkingLevel,
    read: () => selected,
    write: (key) => {
      selected = key;
    }
  });
  return { select, requests, controller, onThinkingLevel, selected: () => selected };
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
