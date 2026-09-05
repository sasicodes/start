import { effect } from '@preact/signals';
import type { ChatStatus, GoalStatus } from '@preload/index';
import { queueEdit } from '@renderer/shared/composer/queue/state';
import { createGoalEditor } from '@renderer/shared/goal/edit';
import { clearGoal, goalState, syncGoal } from '@renderer/shared/goal/state';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { deferred } from '../helpers/deferred.js';

const goalStatus = (
  status: GoalStatus['status'],
  objective = 'Original objective',
  sessionId = 'first'
): ChatStatus => ({
  sessionId,
  ready: true,
  workspacePath: '',
  goal: { status, objective, elapsedMs: 0, iterations: 2 }
});
const cleanups: (() => void)[] = [];
beforeEach(() => {
  clearGoal();
  queueEdit.value = { status: 'idle' };
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.unstubAllGlobals();
});

const setup = (status: GoalStatus['status'] = 'active') => {
  const control = vi.fn(async (_sessionId: string, action: string) =>
    goalStatus(action === 'cancel' ? 'cancelled' : 'paused')
  );
  const update = vi.fn(async (_sessionId: string, objective: string) => goalStatus('paused', objective));
  vi.stubGlobal('window', { pi: { chat: { controlGoal: control, updateGoal: update } } });
  syncGoal(goalStatus(status));
  const context = {
    draft: '',
    hasAttachments: false,
    focus: vi.fn(),
    onDraftChange: (value: string) => {
      context.draft = value;
    }
  };
  const editor = createGoalEditor(() => context);
  cleanups.push(effect(editor.sync));
  return { editor, context, control, update };
};

it('pauses an active goal before loading the objective into the prompt', async () => {
  const state = setup();
  const response = deferred<ChatStatus>();
  state.control.mockReturnValueOnce(response.promise);
  const editing = state.editor.begin();
  expect(state.editor.state.peek().status).toBe('starting');
  expect(state.context.draft).toBe('');
  expect(state.control).toHaveBeenCalledExactlyOnceWith('first', 'pause');
  response.resolve(goalStatus('paused'));
  expect(await editing).toBe(true);
  expect(state.editor.state.peek().status).toBe('editing');
  expect(state.context.draft).toBe('Original objective');
  expect(state.context.focus).toHaveBeenCalledOnce();
});

it('does not edit when the pause fails', async () => {
  const state = setup();
  state.control.mockRejectedValueOnce(new Error('pause failed'));
  expect(await state.editor.begin()).toBe(false);
  expect(state.context.draft).toBe('');
  expect(state.editor.state.peek().status).toBe('idle');
});

it.each(['draft', 'attachments', 'queue'])('preserves existing %s instead of entering goal edit', async (kind) => {
  const state = setup();
  if (kind === 'draft') state.context.draft = 'Unrelated draft';
  if (kind === 'attachments') state.context.hasAttachments = true;
  if (kind === 'queue') queueEdit.value = { status: 'editing', id: 'queued' };
  const original = state.context.draft;
  expect(await state.editor.begin()).toBe(false);
  expect(state.context.draft).toBe(original);
  expect(state.control).not.toHaveBeenCalled();
});

it.each(['draft', 'attachments', 'queue', 'session', 'cancel', 'dispose'])(
  'ignores the pause acknowledgment after a %s change',
  async (kind) => {
    const state = setup();
    const response = deferred<ChatStatus>();
    state.control.mockReturnValueOnce(response.promise);
    const editing = state.editor.begin();
    if (kind === 'draft') state.context.draft = 'New typing';
    if (kind === 'attachments') state.context.hasAttachments = true;
    if (kind === 'queue') queueEdit.value = { status: 'starting', id: 'queued' };
    if (kind === 'session') {
      syncGoal(goalStatus('paused', 'Another objective', 'second'));
      state.context.draft = 'Second session draft';
    }
    if (kind === 'cancel') state.editor.cancel();
    if (kind === 'dispose') state.editor.dispose();
    const original = state.context.draft;
    response.resolve(goalStatus('paused'));
    expect(await editing).toBe(false);
    expect(state.context.draft).toBe(original);
    expect(state.editor.state.peek().status).toBe('idle');
  }
);

it('saves the edited objective once and leaves the goal paused', async () => {
  const state = setup('paused');
  await state.editor.begin();
  state.context.draft = 'Updated objective';
  const response = deferred<ChatStatus>();
  state.update.mockReturnValueOnce(response.promise);
  const saving = state.editor.save();
  expect(await state.editor.save()).toBe(false);
  expect(state.update).toHaveBeenCalledExactlyOnceWith('first', 'Updated objective');
  response.resolve(goalStatus('paused', 'Updated objective'));
  expect(await saving).toBe(true);
  expect(state.context.draft).toBe('');
  expect(state.editor.state.peek().status).toBe('idle');
  expect(goalState.peek()).toMatchObject({ goal: { status: 'paused', objective: 'Updated objective', iterations: 2 } });
});

it('keeps the draft editable after a failed save and rejects blank objectives', async () => {
  const state = setup('paused');
  await state.editor.begin();
  state.context.draft = ' ';
  expect(await state.editor.save()).toBe(false);
  expect(state.update).not.toHaveBeenCalled();
  state.context.draft = 'Updated objective';
  state.update.mockRejectedValueOnce(new Error('failed'));
  expect(await state.editor.save()).toBe(false);
  expect(state.context.draft).toBe('Updated objective');
  expect(state.editor.state.peek().status).toBe('editing');
});

it('keeps new typing held as a goal edit while a save finishes', async () => {
  const state = setup('paused');
  await state.editor.begin();
  state.context.draft = 'Saved objective';
  const response = deferred<ChatStatus>();
  state.update.mockReturnValueOnce(response.promise);
  const saving = state.editor.save();
  state.context.draft = 'New typing';
  response.resolve(goalStatus('paused', 'Saved objective'));
  expect(await saving).toBe(true);
  expect(state.context.draft).toBe('New typing');
  expect(state.editor.state.peek()).toMatchObject({ status: 'editing', objective: 'Saved objective' });
  expect(await state.editor.save()).toBe(true);
  expect(state.update).toHaveBeenLastCalledWith('first', 'New typing');
  expect(state.context.draft).toBe('');
});

it('never clears the next session draft after a delayed save', async () => {
  const state = setup('paused');
  await state.editor.begin();
  const response = deferred<ChatStatus>();
  state.update.mockReturnValueOnce(response.promise);
  const saving = state.editor.save();
  syncGoal(goalStatus('paused', 'Other objective', 'second'));
  state.context.draft = 'Another session draft';
  response.resolve(goalStatus('paused'));
  expect(await saving).toBe(false);
  expect(state.context.draft).toBe('Another session draft');
});

it('Escape cancels editing without resuming or updating the paused goal', async () => {
  const state = setup('paused');
  await state.editor.begin();
  state.context.draft = 'Discard this edit';
  expect(state.editor.cancel()).toBe(true);
  expect(state.editor.cancel()).toBe(false);
  expect(state.context.draft).toBe('');
  expect(state.control).not.toHaveBeenCalled();
  expect(state.update).not.toHaveBeenCalled();
  expect(goalState.peek()).toMatchObject({ goal: { status: 'paused', objective: 'Original objective' } });
});

it('deleting clears the held edit after cancellation succeeds', async () => {
  const state = setup('paused');
  await state.editor.begin();
  await state.editor.remove();
  expect(state.control).toHaveBeenCalledWith('first', 'cancel');
  expect(state.context.draft).toBe('');
  expect(state.editor.state.peek().status).toBe('idle');
});

it('deleting a goal preserves an unrelated draft when there is no held edit', async () => {
  const state = setup('paused');
  state.context.draft = 'Unrelated draft';
  await state.editor.remove();
  expect(state.context.draft).toBe('Unrelated draft');
});

it('drops the held edit if the objective changes externally', async () => {
  const state = setup('paused');
  await state.editor.begin();
  syncGoal(goalStatus('paused', 'Changed elsewhere'));
  expect(state.editor.state.peek().status).toBe('idle');
  expect(state.context.draft).toBe('');
});

it.each(['completed', 'cancelled'] as const)('drops the held edit when the goal becomes %s', async (status) => {
  const state = setup('paused');
  await state.editor.begin();
  state.context.draft = 'Unsaved edit';
  syncGoal(goalStatus(status));
  expect(state.editor.state.peek().status).toBe('idle');
  expect(state.context.draft).toBe('');
  expect(await state.editor.save()).toBe(false);
  expect(state.update).not.toHaveBeenCalled();
});

it('preserves the held edit when delete fails', async () => {
  const state = setup('paused');
  await state.editor.begin();
  state.control.mockRejectedValueOnce(new Error('failed'));
  await state.editor.remove();
  expect(state.context.draft).toBe('Original objective');
  expect(state.editor.state.peek().status).toBe('editing');
});

it('recalls the paused goal from an empty prompt and holds it for editing', () => {
  const state = setup('paused');
  expect(state.editor.recall()).toBe(true);
  expect(state.context.draft).toBe('Original objective');
  expect(state.editor.state.peek().status).toBe('editing');
  expect(state.editor.recall()).toBe(false);
});

it('does not recall a goal over typed text or a terminal goal', () => {
  const state = setup('paused');
  state.context.draft = 'Existing draft';
  expect(state.editor.recall()).toBe(false);
  state.context.draft = '';
  syncGoal(goalStatus('completed'));
  expect(state.editor.recall()).toBe(false);
});
