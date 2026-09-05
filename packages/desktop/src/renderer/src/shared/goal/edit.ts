import { signal } from '@preact/signals';
import { queueEdit } from '@renderer/shared/composer/queue/state';
import { controlGoal, goalState, setGoalError, updateGoal } from '@renderer/shared/goal/state';

interface GoalEditContext {
  draft: string;
  hasAttachments: boolean;
  focus: () => void;
  onDraftChange: (value: string) => void;
}

type GoalEdit =
  | { status: 'idle' }
  | { status: 'starting' | 'editing' | 'saving'; sessionId: string; objective: string };

export const createGoalEditor = (context: () => GoalEditContext) => {
  const state = signal<GoalEdit>({ status: 'idle' });

  const sync = () => {
    const current = state.peek();
    const next = goalState.value;
    if (current.status === 'idle') return;
    const sameSession = current.sessionId === next.sessionId;
    if (sameSession && next.kind !== 'empty') {
      const sameObjective = current.objective === next.goal.objective;
      if (next.goal.status === 'paused' && (sameObjective || current.status === 'saving')) return;
      if (current.status === 'starting' && next.goal.status === 'active' && sameObjective) return;
    }
    state.value = { status: 'idle' };
    if (sameSession && current.status !== 'starting') context().onDraftChange('');
  };

  const begin = async (): Promise<boolean> => {
    const goal = goalState.peek();
    if (state.peek().status !== 'idle' || goal.kind !== 'ready') return false;
    if (goal.goal.status !== 'active' && goal.goal.status !== 'paused') return false;
    const before = context();
    const originalDraft = before.draft;
    if (before.draft.trim() || before.hasAttachments || queueEdit.peek().status !== 'idle') {
      setGoalError('Finish your current draft before editing the goal.');
      return false;
    }

    const request: GoalEdit = { status: 'starting', sessionId: goal.sessionId, objective: goal.goal.objective };
    state.value = request;
    if (goal.goal.status === 'active' && !(await controlGoal('pause'))) {
      if (state.peek() === request) state.value = { status: 'idle' };
      return false;
    }
    if (state.peek() !== request) return false;
    const current = goalState.peek();
    const input = context();
    const sameGoal =
      current.kind === 'ready' &&
      current.sessionId === goal.sessionId &&
      current.goal.status === 'paused' &&
      current.goal.objective === goal.goal.objective;
    if (!sameGoal || input.draft !== originalDraft || input.hasAttachments || queueEdit.peek().status !== 'idle') {
      state.value = { status: 'idle' };
      return false;
    }

    setGoalError('');
    state.value = { ...request, status: 'editing' };
    input.onDraftChange(goal.goal.objective);
    input.focus();
    return true;
  };

  const save = async (): Promise<boolean> => {
    const current = state.peek();
    const input = context();
    const goal = goalState.peek();
    if (current.status !== 'editing' || !input.draft.trim()) return false;
    if (
      goal.kind !== 'ready' ||
      goal.sessionId !== current.sessionId ||
      goal.goal.objective !== current.objective ||
      goal.goal.status !== 'paused'
    ) {
      sync();
      return false;
    }
    const request: GoalEdit = { ...current, status: 'saving' };
    const draft = input.draft;
    state.value = request;
    const saved = await updateGoal(draft);
    if (state.peek() !== request) return false;
    if (!saved) {
      state.value = current;
      return false;
    }
    if (context().draft !== draft) {
      state.value = { ...current, objective: draft.trim() };
      return true;
    }
    state.value = { status: 'idle' };
    context().onDraftChange('');
    context().focus();
    return true;
  };

  const cancel = () => {
    const current = state.peek();
    if (current.status === 'idle') return false;
    if (current.status === 'saving') return true;
    state.value = { status: 'idle' };
    if (current.status === 'editing' && goalState.peek().sessionId === current.sessionId) context().onDraftChange('');
    return true;
  };

  const remove = async () => {
    if (!(await controlGoal('cancel'))) return;
    sync();
  };

  const dispose = () => {
    state.value = { status: 'idle' };
  };

  const recall = () => {
    const goal = goalState.peek();
    const input = context();
    if (state.peek().status !== 'idle' || goal.kind !== 'ready') return false;
    if (
      (goal.goal.status !== 'active' && goal.goal.status !== 'paused') ||
      input.draft.trim() ||
      input.hasAttachments ||
      queueEdit.peek().status !== 'idle'
    )
      return false;
    begin();
    return true;
  };

  return { state, begin, save, cancel, remove, sync, dispose, recall };
};

export const goalEditor = signal<ReturnType<typeof createGoalEditor> | null>(null);
