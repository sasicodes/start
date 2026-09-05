import { computed, signal } from '@preact/signals';
import type { ChatStatus, GoalAction, GoalStatus } from '@preload/index';

type GoalView =
  | { kind: 'empty'; sessionId: string }
  | { kind: 'ready' | 'saving'; sessionId: string; goal: GoalStatus; error: string };

export const goalState = signal<GoalView>({ kind: 'empty', sessionId: '' });
export const visibleGoal = computed(() => {
  const state = goalState.value;
  if (state.kind === 'empty' || state.goal.status === 'completed' || state.goal.status === 'cancelled') return null;
  return state;
});
let revision = 0;

export const goalVersion = () => revision;

const writeStatus = (status: ChatStatus) => {
  const sessionId = status.sessionId ?? '';
  const goal = status.goal;
  const current = goalState.peek();
  if (!goal || !sessionId) {
    if (current.kind !== 'empty' || current.sessionId !== sessionId) goalState.value = { kind: 'empty', sessionId };
    return;
  }
  if (
    current.kind === 'ready' &&
    current.sessionId === sessionId &&
    !current.error &&
    current.goal.status === goal.status &&
    current.goal.objective === goal.objective &&
    current.goal.iterations === goal.iterations &&
    current.goal.reason === goal.reason
  )
    return;
  goalState.value = { kind: 'ready', sessionId, goal, error: '' };
};

export const clearGoal = () => {
  revision += 1;
  goalState.value = { kind: 'empty', sessionId: '' };
};

export const syncGoal = (status: ChatStatus, version = revision) => {
  if (version !== revision) return;
  const current = goalState.peek();
  const sessionId = status.sessionId ?? '';
  if (current.kind === 'saving' && current.sessionId === sessionId) return;
  if (current.sessionId !== sessionId) revision += 1;
  writeStatus(status);
};

export const controlGoal = async (action: GoalAction) => {
  const current = goalState.peek();
  if (current.kind !== 'ready') return;
  const status = current.goal.status;
  if (status === 'completed' || status === 'cancelled') return;
  if ((action === 'pause' && status !== 'active') || (action === 'resume' && status !== 'paused')) return;

  const request = revision + 1;
  revision = request;
  goalState.value = { ...current, kind: 'saving', error: '' };
  try {
    const result = await window.pi.chat.controlGoal(current.sessionId, action);
    if (revision !== request || goalState.peek().sessionId !== current.sessionId) return;
    revision += 1;
    const expectedStatus = action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'cancelled';
    if (result.sessionId !== current.sessionId || result.goal?.status !== expectedStatus) {
      goalState.value = { ...current, error: result.error ?? 'Goal could not be updated.' };
      return;
    }
    writeStatus(result);
  } catch {
    if (revision !== request || goalState.peek().sessionId !== current.sessionId) return;
    revision += 1;
    goalState.value = { ...current, error: 'Goal could not be updated.' };
  }
};
