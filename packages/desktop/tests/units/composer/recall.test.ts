import { cancelQueueEdit, editingQueuedId, queueEdit } from '@renderer/shared/composer/queue/state';
import { createMessageRecall, type RecallContext } from '@renderer/shared/composer/recall';
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

const setup = () => {
  const context: RecallContext = {
    draft: '',
    queuedIds: ['q1'],
    entries: ['queued text', 'sent text'],
    onDraftChange: (value) => {
      context.draft = value;
    }
  };
  return { context, recall: createMessageRecall(() => context) };
};

describe('composer queue recall', () => {
  it('holds the queued item before opening it in the editor', async () => {
    const gate = deferred<boolean>();
    hold.mockReturnValueOnce(gate.promise);
    const { context, recall } = setup();

    expect(recall.older()).toBe(true);
    expect(hold).toHaveBeenCalledWith('q1', true);
    expect(context.draft).toBe('');
    gate.resolve(true);

    await vi.waitFor(() => expect(context.draft).toBe('queued text'));
    expect(editingQueuedId.value).toBe('q1');
  });

  it('does not recall stale text when the agent already consumed the item', async () => {
    hold.mockResolvedValueOnce(false);
    const { context, recall } = setup();
    recall.older();

    await vi.waitFor(() => expect(queueEdit.value.status).toBe('idle'));
    expect(context.draft).toBe('');
  });

  it('retains the hold when the edited text is temporarily empty', async () => {
    const { context, recall } = setup();
    recall.older();
    await vi.waitFor(() => expect(context.draft).toBe('queued text'));
    context.draft = '';

    await recall.save();

    expect(edit).not.toHaveBeenCalled();
    expect(editingQueuedId.value).toBe('q1');
    expect(hold).not.toHaveBeenCalledWith('q1', false);
  });

  it('does not replace text typed while the hold request was pending', async () => {
    const gate = deferred<boolean>();
    hold.mockReturnValueOnce(gate.promise);
    const { context, recall } = setup();
    recall.older();
    context.draft = 'new typing';
    gate.resolve(true);

    await vi.waitFor(() => expect(hold).toHaveBeenCalledWith('q1', false));
    expect(context.draft).toBe('new typing');
    expect(editingQueuedId.value).toBe('');
  });

  it('saves unchanged text and clears the draft after acknowledgement', async () => {
    const { context, recall } = setup();
    recall.older();
    await vi.waitFor(() => expect(context.draft).toBe('queued text'));

    await recall.save();

    expect(edit).toHaveBeenCalledExactlyOnceWith('q1', 'queued text');
    expect(context.draft).toBe('');
    expect(editingQueuedId.value).toBe('');
  });

  it('preserves new typing while a save is pending', async () => {
    const { context, recall } = setup();
    recall.older();
    await vi.waitFor(() => expect(context.draft).toBe('queued text'));
    const gate = deferred<boolean>();
    edit.mockReturnValueOnce(gate.promise);
    const save = recall.save();
    context.draft = 'a different draft';
    gate.resolve(true);
    await save;

    expect(context.draft).toBe('a different draft');
  });

  it('releases the original message when moving back to the empty draft', async () => {
    const { context, recall } = setup();
    recall.older();
    await vi.waitFor(() => expect(context.draft).toBe('queued text'));

    expect(recall.newer()).toBe(true);

    await vi.waitFor(() => expect(context.draft).toBe(''));
    expect(hold).toHaveBeenCalledWith('q1', false);
    expect(editingQueuedId.value).toBe('');
  });

  it('cancels editing on Escape even after the text has changed', async () => {
    const { context, recall } = setup();
    recall.older();
    await vi.waitFor(() => expect(context.draft).toBe('queued text'));
    context.draft = 'edited';

    expect(recall.cancel()).toBe(true);

    expect(context.draft).toBe('');
    expect(hold).toHaveBeenCalledWith('q1', false);
    expect(recall.cancel()).toBe(false);
  });

  it('releases pending holds when the composer unmounts', async () => {
    const gate = deferred<boolean>();
    hold.mockReturnValueOnce(gate.promise);
    const { context, recall } = setup();
    recall.older();
    recall.dispose();
    gate.resolve(true);

    await vi.waitFor(() => expect(queueEdit.value.status).toBe('idle'));
    expect(hold).toHaveBeenCalledWith('q1', false);
    expect(context.draft).toBe('');
  });

  it('recalls sent history without creating a queue hold', async () => {
    const { context, recall } = setup();
    context.queuedIds = [];
    context.entries = ['sent text'];
    recall.older();

    await vi.waitFor(() => expect(context.draft).toBe('sent text'));
    expect(hold).not.toHaveBeenCalled();
    expect(editingQueuedId.value).toBe('');
  });
});
