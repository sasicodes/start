import { appendLiveAssistantTurn, upsertLiveAssistantDetail } from '@main/chat/live';
import type { ChatEvent, HistoryTurn } from '@main/types';

const liveTurn: HistoryTurn = {
  id: 'live',
  role: 'assistant',
  text: 'answer',
  createdAt: 2000,
  streaming: true
};

describe('appendLiveAssistantTurn', () => {
  it('replaces trailing work-only history with the live assistant turn', () => {
    const turns: HistoryTurn[] = [
      { id: 'user', role: 'user', text: 'what is this codebase', createdAt: 1000 },
      { id: 'work', role: 'event', text: '', createdAt: 1100, thinking: 'inspecting files' }
    ];

    expect(appendLiveAssistantTurn(turns, liveTurn).map((turn) => turn.id)).toEqual(['user', 'live']);
  });

  it('keeps normal completed turns before the live assistant turn', () => {
    const turns: HistoryTurn[] = [
      { id: 'user', role: 'user', text: 'what is this codebase', createdAt: 1000 },
      { id: 'assistant', role: 'assistant', text: 'previous answer', createdAt: 1100 }
    ];

    expect(appendLiveAssistantTurn(turns, liveTurn).map((turn) => turn.id)).toEqual(['user', 'assistant', 'live']);
  });

  it('preserves pending history thinking and details while appending new live work', () => {
    const pending = upsertLiveAssistantDetail(
      [],
      { key: 'tool:old', title: 'Read file', kind: 'tool', state: 'done' },
      'work',
      1000
    );
    const current = upsertLiveAssistantDetail(
      [],
      { key: 'tool:new', title: 'Running command', kind: 'tool', state: 'active' },
      'live',
      2000
    );
    const turns: HistoryTurn[] = [
      { id: 'work', role: 'event', text: '', createdAt: 1000, thinking: 'Earlier thought.', details: pending }
    ];
    const result = appendLiveAssistantTurn(turns, {
      ...liveTurn,
      thinking: 'Current thought.',
      details: [...pending, ...current]
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.thinking).toBe('Earlier thought.\nCurrent thought.');
    expect(result[0]?.details?.map((detail) => detail.key)).toEqual(['tool:old', 'tool:new']);
    expect(turns[0]?.details).toEqual(pending);
  });

  it('keeps unfinished tools live without replaying completed tools', () => {
    const done = upsertLiveAssistantDetail(
      [],
      { key: 'tool:done', title: 'Read file', kind: 'tool', state: 'done' },
      'answer',
      1000
    );
    const pending = upsertLiveAssistantDetail(
      [],
      { key: 'tool:active', title: 'Ran command', kind: 'tool', state: 'done' },
      'answer',
      1000
    );
    const active = upsertLiveAssistantDetail(
      [],
      { key: 'tool:active', title: 'Running command', kind: 'tool', state: 'active' },
      'live',
      2000
    );
    const result = appendLiveAssistantTurn(
      [{ id: 'answer', role: 'assistant', text: 'Inspecting.', createdAt: 1000, details: [...done, ...pending] }],
      { ...liveTurn, details: [...done, ...active] }
    );

    expect(result[0]?.details).toEqual(done);
    expect(result[1]?.details).toEqual(active);
  });

  it('replaces a tool-only history placeholder with its active live tool', () => {
    const pending = upsertLiveAssistantDetail(
      [],
      { key: 'tool:active', title: 'Ran command', kind: 'tool', state: 'done' },
      'work',
      1000
    );
    const active = upsertLiveAssistantDetail(
      [],
      { key: 'tool:active', title: 'Running command', kind: 'tool', state: 'active' },
      'live',
      2000
    );
    const result = appendLiveAssistantTurn(
      [{ id: 'work', role: 'event', text: '', createdAt: 1000, details: pending }],
      { ...liveTurn, details: active }
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('live');
    expect(result[0]?.details).toEqual(active);
  });
});

describe('upsertLiveAssistantDetail', () => {
  it('merges tool lifecycle updates by key', () => {
    const active: ChatEvent = { key: 'tool:read-1', title: 'Reading file', kind: 'tool', state: 'active' };
    const done: ChatEvent = { key: 'tool:read-1', title: 'Read file', kind: 'tool', state: 'done' };

    const started = upsertLiveAssistantDetail([], active, 'live', 1000);
    const completed = upsertLiveAssistantDetail(started, done, 'live', 2000);

    expect(completed).toEqual([
      expect.objectContaining({
        id: 'live:detail:0',
        key: 'tool:read-1',
        count: 2,
        state: 'done',
        title: 'Read file',
        createdAt: 1000,
        updatedAt: 2000
      })
    ]);
  });

  it('preserves separate tool keys', () => {
    const first: ChatEvent = { key: 'tool:read-1', title: 'Read first', kind: 'tool', state: 'done' };
    const second: ChatEvent = { key: 'tool:read-2', title: 'Read second', kind: 'tool', state: 'done' };

    const details = upsertLiveAssistantDetail(upsertLiveAssistantDetail([], first, 'live', 1000), second, 'live', 2000);

    expect(details.map((detail) => detail.key)).toEqual(['tool:read-1', 'tool:read-2']);
  });

  it('bounds unique live details while preserving unique ids', () => {
    let details: NonNullable<HistoryTurn['details']> = [];
    for (let index = 0; index < 34; index++) {
      details = upsertLiveAssistantDetail(
        details,
        { key: `tool:${index}`, title: `Tool ${index}`, kind: 'tool', state: 'done' },
        'live',
        index
      );
    }

    expect(details).toHaveLength(32);
    expect(details.at(0)?.key).toBe('tool:2');
    expect(new Set(details.map((detail) => detail.id)).size).toBe(32);
  });
});
