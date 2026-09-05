import { recallOlderInput } from '@renderer/shared/composer/recall';
import { expect, it, vi } from 'vitest';

it('keeps queued messages ahead of goal editing', () => {
  const history = vi.fn(() => true);
  const goal = vi.fn(() => true);
  expect(recallOlderInput(true, history, goal)).toBe(true);
  expect(history).toHaveBeenCalledOnce();
  expect(goal).not.toHaveBeenCalled();
});

it('recalls a goal before sent-message history when the queue is empty', () => {
  const history = vi.fn(() => true);
  const goal = vi.fn(() => true);
  expect(recallOlderInput(false, history, goal)).toBe(true);
  expect(goal).toHaveBeenCalledOnce();
  expect(history).not.toHaveBeenCalled();
});

it('falls back to sent-message history when no goal can be edited', () => {
  const history = vi.fn(() => true);
  const goal = vi.fn(() => false);
  expect(recallOlderInput(false, history, goal)).toBe(true);
  expect(history).toHaveBeenCalledOnce();
});
