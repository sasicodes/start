import { describe, expect, it } from 'vitest';
import { promptPlaceholder } from '@renderer/shared/placeholder';

const followUp = (contextPercent: number, index = 0) => promptPlaceholder(true, false, contextPercent, index);

describe('promptPlaceholder', () => {
  it('shows the single follow-up label below 60%', () => {
    expect(followUp(0, 0)).toBe('Ask for follow-up changes');
    expect(followUp(0, 1)).toBe('Ask for follow-up changes');
    expect(followUp(59.9, 9)).toBe('Ask for follow-up changes');
  });

  it('toggles between the follow-up label and the band label once at or above 60%', () => {
    expect(followUp(60, 0)).toBe('Ask for follow-up changes');
    expect(followUp(60, 1)).toBe('Context window at 60%');
    expect(followUp(60, 2)).toBe('Ask for follow-up changes');
    expect(followUp(75, 1)).toBe('Context window at 70%');
    expect(followUp(99, 1)).toBe('Context window at 90%');
    expect(followUp(100, 1)).toBe('Context window at 100%');
  });

  it('ignores context percent for new sessions and cycles the entry list', () => {
    expect(promptPlaceholder(false, false, 80, 0)).toBe('Ask to plan or work on something');
    expect(promptPlaceholder(false, false, 80, 1)).toBe('Type / to load a skill');
    expect(promptPlaceholder(false, false, 80, 2)).toBe('Type ! to run a shell command');
  });

  it('returns the command-mode label regardless of turns or context', () => {
    expect(promptPlaceholder(false, true, 0)).toBe('Run a shell command');
    expect(promptPlaceholder(true, true, 75)).toBe('Run a shell command');
  });
});
