import { computed, signal } from '@preact/signals';
import type { QueuedMessage } from '@preload/index';

type QueueEdit = { status: 'idle' } | { status: 'starting' | 'editing' | 'saving'; id: string };

export const queueEdit = signal<QueueEdit>({ status: 'idle' });
export const editingQueuedId = computed(() => (queueEdit.value.status !== 'idle' ? queueEdit.value.id : ''));

export const cancelQueueEdit = async (id = editingQueuedId.peek()) => {
  if (!id || editingQueuedId.peek() !== id) return;

  queueEdit.value = { status: 'idle' };
  try {
    await window.pi.chat.setQueuedMessageEditing(id, false);
  } catch {}
};

export const beginQueueEdit = async (id: string): Promise<boolean> => {
  const previousId = editingQueuedId.peek();
  const request: QueueEdit = { id, status: 'starting' };
  queueEdit.value = request;

  try {
    const held = await window.pi.chat.setQueuedMessageEditing(id, true);
    if (previousId && previousId !== id && editingQueuedId.peek() !== previousId)
      await window.pi.chat.setQueuedMessageEditing(previousId, false);
    if (queueEdit.peek() !== request) {
      if (editingQueuedId.peek() !== id) await window.pi.chat.setQueuedMessageEditing(id, false);
      return false;
    }
    if (!held) {
      queueEdit.value = { status: 'idle' };
      return false;
    }

    queueEdit.value = { id, status: 'editing' };
    return true;
  } catch {
    if (queueEdit.peek() === request) await cancelQueueEdit(id);
    return false;
  }
};

export const saveQueueEdit = async (text: string): Promise<boolean> => {
  const current = queueEdit.peek();
  if (current.status !== 'editing' || !text.trim()) return false;

  const request: QueueEdit = { id: current.id, status: 'saving' };
  queueEdit.value = request;
  try {
    const saved = await window.pi.chat.editQueuedMessage(current.id, text);
    if (queueEdit.peek() !== request) return false;
    queueEdit.value = saved ? { status: 'idle' } : current;
    return saved;
  } catch {
    if (queueEdit.peek() === request) queueEdit.value = current;
    return false;
  }
};

export const syncQueueEdit = (messages: QueuedMessage[]) => {
  const current = queueEdit.peek();
  if (current.status === 'editing' && !messages.some((message) => message.id === current.id)) {
    cancelQueueEdit(current.id);
  }
};
