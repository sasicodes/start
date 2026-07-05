import { recallNewer, recallOlder } from '@renderer/shared/chat/recall';
import { useRef } from 'preact/hooks';

export const useMessageRecall = (
  entries: string[],
  queuedIds: string[],
  draft: string,
  onDraftChange: (value: string) => void
) => {
  const indexRef = useRef(-1);
  const injectedRef = useRef('');
  const editingIdRef = useRef('');

  const resetOnEdit = () => {
    if (draft !== injectedRef.current) indexRef.current = -1;
  };

  const apply = (text: string, index: number) => {
    indexRef.current = index;
    injectedRef.current = text;
    editingIdRef.current = queuedIds[index] ?? '';
    onDraftChange(text);
  };

  const older = () => {
    resetOnEdit();
    if (indexRef.current === -1 && draft.trim()) return false;

    const step = recallOlder(entries, indexRef.current);
    if (!step) return false;

    apply(step.text, step.index);
    return true;
  };

  const newer = () => {
    resetOnEdit();
    const step = recallNewer(entries, indexRef.current);
    if (!step) return false;

    apply(step.text, step.index);
    return true;
  };

  const editingId = () => (draft.trim() ? editingIdRef.current : '');

  const clearEditing = () => {
    editingIdRef.current = '';
    indexRef.current = -1;
  };

  return { older, newer, editingId, clearEditing };
};
