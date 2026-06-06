import { historyTurns } from '@main/history';
import { describe, expect, it } from 'vitest';

const messageEntry = (id: string, role: string, content: unknown, extras: Record<string, unknown> = {}) => ({
  id,
  type: 'message',
  timestamp: '2026-05-24T12:00:00Z',
  message: { role, content, ...extras }
});

describe('historyTurns', () => {
  it('returns a user turn when content has text', () => {
    const turns = historyTurns([messageEntry('u1', 'user', [{ type: 'text', text: 'hello' }])]);
    expect(turns).toHaveLength(1);
    expect(turns[0]?.role).toBe('user');
    expect(turns[0]?.text).toBe('hello');
  });

  it('drops a user turn with empty content', () => {
    expect(historyTurns([messageEntry('u2', 'user', [])])).toHaveLength(0);
  });

  it('emits assistant turns alongside tool call details when no result exists', () => {
    const turns = historyTurns([
      messageEntry('a1', 'assistant', [
        { type: 'text', text: 'reply' },
        { type: 'toolCall', id: 't-1', name: 'read', arguments: { path: '/x' } }
      ])
    ]);
    expect(turns[0]?.role).toBe('assistant');
    expect(turns[0]?.text).toBe('reply');
    expect(turns[0]?.details?.[0]?.title).toContain('Explor');
  });

  it('represents thinking-level changes as event-kind turns', () => {
    const turns = historyTurns([
      { id: 't1', type: 'thinking_level_change', timestamp: '2026-05-24T12:00:00Z', thinkingLevel: 'high' }
    ]);
    expect(turns[0]?.role).toBe('event');
    expect(turns[0]?.details?.[0]?.title).toContain('Thinking level');
  });

  it('keeps thinking after assistant text with the following assistant response', () => {
    const turns = historyTurns([
      messageEntry('a1', 'assistant', [{ type: 'text', text: 'first result' }]),
      messageEntry('a2', 'assistant', [{ type: 'thinking', thinking: 'next thought' }]),
      messageEntry('a3', 'assistant', [{ type: 'text', text: 'second result' }])
    ]);

    expect(turns).toHaveLength(2);
    expect(turns[0]?.text).toBe('first result');
    expect(turns[0]?.thinking).toBeFalsy();
    expect(turns[1]?.text).toBe('second result');
    expect(turns[1]?.thinking).toBe('next thought');
  });

  it('keeps trailing work after the assistant response that preceded it', () => {
    const turns = historyTurns([
      messageEntry('a1', 'assistant', [{ type: 'text', text: 'done for now' }]),
      messageEntry('a2', 'assistant', [{ type: 'thinking', thinking: 'checking more' }])
    ]);

    expect(turns).toHaveLength(2);
    expect(turns[0]?.text).toBe('done for now');
    expect(turns[0]?.thinking).toBeFalsy();
    expect(turns[1]?.role).toBe('event');
    expect(turns[1]?.thinking).toBe('checking more');
  });
});
