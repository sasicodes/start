import { type RecallStep, recallNewer, recallOlder } from '@renderer/shared/chat/recall';
import { beginQueueEdit, cancelQueueEdit, editingQueuedId, saveQueueEdit } from '@renderer/shared/composer/queue/state';

export interface RecallContext {
  draft: string;
  entries: string[];
  queuedIds: string[];
  onDraftChange: (value: string) => void;
}

export const createMessageRecall = (context: () => RecallContext) => {
  let index = -1;
  let requestId = 0;
  let injected = '';
  let heldId = '';

  const resetOnEdit = () => {
    if (context().draft !== injected) index = -1;
  };

  const clearEditing = () => {
    requestId += 1;
    index = -1;
    injected = '';
    heldId = '';
  };

  const apply = async (step: RecallStep) => {
    const { draft, queuedIds, onDraftChange } = context();
    const request = ++requestId;
    const id = queuedIds[step.index] ?? '';
    index = step.index;
    heldId = id;
    if (id) {
      if (!(await beginQueueEdit(id))) {
        if (request === requestId) index = -1;
        return;
      }
    } else {
      await cancelQueueEdit();
    }

    if (request !== requestId) return;
    if (context().draft !== draft) {
      if (id) await cancelQueueEdit(id);
      return;
    }

    if (id && editingQueuedId.peek() !== id) return;
    injected = step.text;
    onDraftChange(step.text);
  };

  const older = () => {
    const { draft, entries } = context();
    resetOnEdit();
    if (index === -1 && draft.trim()) return false;

    const step = recallOlder(entries, index);
    if (!step) return false;

    apply(step);
    return true;
  };

  const newer = () => {
    const { entries } = context();
    resetOnEdit();
    const step = recallNewer(entries, index);
    if (!step) return false;

    apply(step);
    return true;
  };

  const save = async () => {
    const { draft, onDraftChange } = context();
    if (!(await saveQueueEdit(draft.trim()))) return;

    clearEditing();
    if (context().draft === draft) onDraftChange('');
  };

  const cancel = () => {
    if (!editingQueuedId.peek()) return false;

    cancelQueueEdit();
    clearEditing();
    context().onDraftChange('');
    return true;
  };

  const dispose = () => {
    requestId += 1;
    cancelQueueEdit(heldId);
  };

  return { older, newer, save, cancel, dispose };
};
