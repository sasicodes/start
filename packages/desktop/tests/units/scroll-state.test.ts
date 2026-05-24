import { beforeEach, describe, expect, it } from 'vitest';
import {
  scrollSessionToBottom,
  scrollToBottomButtonState,
  scrollTurnToStart,
  turnScrollIntentState
} from '@renderer/shared/turn/scroll';

describe('scroll state', () => {
  beforeEach(() => {
    scrollToBottomButtonState.value = false;
    turnScrollIntentState.value = { kind: 'bottom', sequence: 0 };
  });

  it('defaults to bottom intent so freshly opened sessions land at the latest turn', () => {
    expect(turnScrollIntentState.value.kind).toBe('bottom');
  });

  it('produces a bottom intent with a fresh sequence on scrollSessionToBottom', () => {
    const before = turnScrollIntentState.value.sequence;
    scrollSessionToBottom();
    const after = turnScrollIntentState.value;
    expect(after.kind).toBe('bottom');
    expect(after.sequence).toBeGreaterThan(before);
  });

  it('produces a turn-start intent that carries the target turn id', () => {
    scrollTurnToStart('turn-abc');
    const intent = turnScrollIntentState.value;
    expect(intent.kind).toBe('turn-start');
    if (intent.kind === 'turn-start') expect(intent.turnId).toBe('turn-abc');
  });

  it('increments the sequence monotonically across mixed intents', () => {
    scrollSessionToBottom();
    const first = turnScrollIntentState.value.sequence;
    scrollTurnToStart('turn-1');
    const second = turnScrollIntentState.value.sequence;
    scrollSessionToBottom();
    const third = turnScrollIntentState.value.sequence;
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
  });
});
