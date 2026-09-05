import {
  beginQueueEdit,
  cancelQueueEdit,
  editingQueuedId,
  queueEdit,
  saveQueueEdit,
  syncQueueEdit
} from '@renderer/shared/composer/queue/state';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred } from '../../helpers/deferred.js';

const hold = vi.fn<(id: string, editing: boolean) => Promise<boolean>>();
const edit = vi.fn<(id: string, text: string) => Promise<boolean>>();

beforeEach(() => {
  queueEdit.value = { status: 'idle' };
  hold.mockResolvedValue(true);
  edit.mockResolvedValue(true);
  vi.stubGlobal('window', { pi: { chat: { setQueuedMessageEditing: hold, editQueuedMessage: edit } } });
});

afterEach(async () => {
  await cancelQueueEdit();
  vi.unstubAllGlobals();
});

describe('queue editing state', () => {
  it('keeps the current hold when older recall requests finish late', async () => {
    const gates = [deferred<boolean>(), deferred<boolean>(), deferred<boolean>()];
    let held = '';
    let index = 0;
    hold.mockImplementation(async (id, editing) => {
      if (!editing) {
        if (held === id) held = '';
        return true;
      }
      held = id;
      const gate = gates[index++];
      if (!gate) throw new Error('Missing hold response.');
      return gate.promise;
    });
    const first = beginQueueEdit('q1');
    const second = beginQueueEdit('q2');
    const third = beginQueueEdit('q1');
    for (const gate of gates) gate.resolve(true);

    expect(await Promise.all([first, second, third])).toEqual([false, false, true]);
    expect(held).toBe('q1');
    expect(editingQueuedId.value).toBe('q1');
  });

  it('does not clear a newer edit when an older hold request fails', async () => {
    const gate = deferred<boolean>();
    hold.mockImplementationOnce(async () => {
      await gate.promise;
      throw new Error('old request failed');
    });
    const first = beginQueueEdit('q1');
    await beginQueueEdit('q2');
    gate.resolve(true);

    expect(await first).toBe(false);
    expect(editingQueuedId.value).toBe('q2');
  });

  it('preserves the edit after a failed save', async () => {
    await beginQueueEdit('q1');
    edit.mockRejectedValueOnce(new Error('save failed'));

    expect(await saveQueueEdit('updated')).toBe(false);
    expect(queueEdit.value).toEqual({ id: 'q1', status: 'editing' });
  });

  it('does not issue duplicate saves', async () => {
    await beginQueueEdit('q1');
    const gate = deferred<boolean>();
    edit.mockReturnValueOnce(gate.promise);
    const saving = saveQueueEdit('updated');
    expect(await saveQueueEdit('updated')).toBe(false);
    gate.resolve(true);

    expect(await saving).toBe(true);
    expect(edit).toHaveBeenCalledOnce();
  });

  it('ignores save completion after the user leaves the edit', async () => {
    await beginQueueEdit('q1');
    const gate = deferred<boolean>();
    edit.mockReturnValueOnce(gate.promise);
    const saving = saveQueueEdit('updated');
    await cancelQueueEdit();
    await beginQueueEdit('q2');
    gate.resolve(true);

    expect(await saving).toBe(false);
    expect(editingQueuedId.value).toBe('q2');
  });

  it('clears a deleted item but preserves a save that was delivered immediately', async () => {
    await beginQueueEdit('q1');
    syncQueueEdit([]);
    expect(editingQueuedId.value).toBe('');

    await beginQueueEdit('q2');
    const gate = deferred<boolean>();
    edit.mockReturnValueOnce(gate.promise);
    const saving = saveQueueEdit('updated');
    syncQueueEdit([]);
    expect(queueEdit.value.status).toBe('saving');
    gate.resolve(true);
    expect(await saving).toBe(true);
  });
});
