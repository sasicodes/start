import { describe, expect, it, vi } from 'vitest';

vi.unmock('@main/storage');

const { parseStartState } = await import('@main/storage');

describe('parseStartState', () => {
  it('falls back to defaults for missing or invalid values', () => {
    const state = parseStartState({});
    expect(state.composerShortcut).toBe('Control+Space');
    expect(state.selectedThinkingLevel).toBe('high');
  });

  it('keeps a valid thinking level and ignores unknown ones', () => {
    expect(parseStartState({ selectedThinkingLevel: 'low' }).selectedThinkingLevel).toBe('low');
    expect(parseStartState({ selectedThinkingLevel: 'wat' }).selectedThinkingLevel).toBe('high');
  });

  it('keeps trimmed strings for paths and drops blank ones', () => {
    expect(parseStartState({ lastWorkspace: '   /tmp/ws  ' }).lastWorkspace).toBe('/tmp/ws');
    expect(parseStartState({ lastWorkspace: '   ' }).lastWorkspace).toBeUndefined();
  });

  it('keeps only valid notices with required fields and known kinds', () => {
    const state = parseStartState({
      sessionNotices: {
        bad: { kind: 'unknown', sessionId: 'bad', workspacePath: '/x' },
        ok: { kind: 'completed', sessionId: 'ok', workspacePath: '/y', createdAt: 1, seenAt: 2 }
      }
    });
    expect(state.sessionNotices?.bad).toBeUndefined();
    expect(state.sessionNotices?.ok?.kind).toBe('completed');
    expect(state.sessionNotices?.ok?.seenAt).toBe(2);
  });
});
