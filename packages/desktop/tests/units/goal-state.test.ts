import type { ChatStatus, GoalStatus } from '@preload/index';
import { clearGoal, controlGoal, goalState, goalVersion, syncGoal, visibleGoal } from '@renderer/shared/goal/state';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { deferred } from '../helpers/deferred.js';

const status = (sessionId: string, state: GoalStatus['status'] = 'active'): ChatStatus => ({
  sessionId,
  ready: true,
  workspacePath: '',
  goal: { status: state, elapsedMs: 0, iterations: 1, objective: `Goal for ${sessionId}` }
});

beforeEach(clearGoal);
afterEach(() => vi.unstubAllGlobals());

const setup = () => {
  const response = deferred<ChatStatus>();
  const control = vi.fn(() => response.promise);
  vi.stubGlobal('window', { pi: { chat: { controlGoal: control } } });
  syncGoal(status('first'));
  return { control, response };
};

it('updates the goal from status and preserves unchanged snapshots', () => {
  syncGoal(status('first'));
  const previous = goalState.peek();
  syncGoal(status('first'));
  expect(goalState.peek()).toBe(previous);
  syncGoal(status('second', 'paused'));
  expect(goalState.peek()).toMatchObject({ sessionId: 'second', goal: { status: 'paused' } });
});

it('clears the previous goal when opening a session without one', () => {
  syncGoal(status('first'));
  syncGoal({ ready: true, sessionId: 'second', workspacePath: '' });
  expect(goalState.peek()).toEqual({ kind: 'empty', sessionId: 'second' });
});

it('sends one pause request and rejects stale status refreshes after it completes', async () => {
  const state = setup();
  const version = goalVersion();
  const saving = controlGoal('pause');
  expect(goalState.peek().kind).toBe('saving');
  await controlGoal('pause');
  syncGoal(status('first'), goalVersion());
  expect(goalState.peek().kind).toBe('saving');
  expect(state.control).toHaveBeenCalledExactlyOnceWith('first', 'pause');
  state.response.resolve(status('first', 'paused'));
  await saving;
  syncGoal(status('first'), version);
  expect(goalState.peek()).toMatchObject({ kind: 'ready', goal: { status: 'paused' } });
});

it.each(['switch', 'clear'])('ignores an old control response after a session %s', async (action) => {
  const state = setup();
  const saving = controlGoal('pause');
  if (action === 'switch') syncGoal(status('second'));
  else clearGoal();
  const current = goalState.peek();
  state.response.resolve(status('first', 'paused'));
  await saving;
  expect(goalState.peek()).toBe(current);
});

it.each(['failure', 'rejection', 'wrong-session'])(
  'preserves the current goal and reports a control %s',
  async (result) => {
    const state = setup();
    const saving = controlGoal('pause');
    if (result === 'failure') state.response.resolve({ ready: false, workspacePath: '', error: 'Pause failed.' });
    else if (result === 'wrong-session') state.response.resolve(status('second'));
    else state.response.reject(new Error('unavailable'));
    await saving;
    expect(goalState.peek()).toMatchObject({ kind: 'ready', sessionId: 'first', goal: { status: 'active' } });
    const current = goalState.peek();
    expect(current.kind !== 'empty' && current.error).toBeTruthy();
  }
);

it.each(['resume', 'cancel'] as const)('controls a paused goal using %s', async (action) => {
  const state = setup();
  syncGoal(status('first', 'paused'));
  const saving = controlGoal(action);
  state.response.resolve(status('first', action === 'resume' ? 'active' : 'cancelled'));
  await saving;
  expect(state.control).toHaveBeenCalledExactlyOnceWith('first', action);
  expect(goalState.peek()).toMatchObject({
    kind: 'ready',
    goal: { status: action === 'resume' ? 'active' : 'cancelled' }
  });
});

it('does not send invalid controls or operate on a finished goal', async () => {
  const state = setup();
  await controlGoal('resume');
  syncGoal(status('first', 'completed'));
  await controlGoal('cancel');
  clearGoal();
  await controlGoal('pause');
  expect(state.control).not.toHaveBeenCalled();
});

it('accepts a cancelled goal when no model is available', async () => {
  const state = setup();
  const saving = controlGoal('cancel');
  state.response.resolve({ ...status('first', 'cancelled'), ready: false, error: 'No configured models found.' });
  await saving;
  expect(goalState.peek()).toMatchObject({ kind: 'ready', error: '', goal: { status: 'cancelled' } });
});

it('reports a rejected resume without changing the paused goal', async () => {
  const state = setup();
  syncGoal(status('first', 'paused'));
  const saving = controlGoal('resume');
  state.response.resolve({ ...status('first', 'paused'), ready: false, error: 'No configured models found.' });
  await saving;
  expect(goalState.peek()).toMatchObject({
    kind: 'ready',
    error: 'No configured models found.',
    goal: { status: 'paused' }
  });
});

it.each(['active', 'paused', 'completed', 'cancelled'] as const)(
  'shows only an active or paused goal (%s)',
  (goalStatus) => {
    syncGoal(status('first', goalStatus));
    if (goalStatus === 'active' || goalStatus === 'paused') {
      expect(visibleGoal.peek()?.goal.status).toBe(goalStatus);
    } else {
      expect(visibleGoal.peek()).toBeNull();
    }
  }
);

it('keeps a pending control visible and removes the goal after cancellation', async () => {
  const state = setup();
  const saving = controlGoal('cancel');
  expect(visibleGoal.peek()?.kind).toBe('saving');
  state.response.resolve(status('first', 'cancelled'));
  await saving;
  expect(visibleGoal.peek()).toBeNull();
  clearGoal();
  expect(visibleGoal.peek()).toBeNull();
});
