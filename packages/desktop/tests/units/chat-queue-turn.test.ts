import { createQueuedTurns } from '@renderer/shared/chat/utils/queue';
import { expect, it } from 'vitest';

it('creates only a streaming assistant for automatic goal continuation', () => {
  const turns = createQueuedTurns({ id: 'internal', kind: 'continuation' });
  expect(turns.user).toBeNull();
  expect(turns.assistant).toMatchObject({ role: 'assistant', streaming: true, text: '' });
});

it('keeps real user messages even when their text matches the old continuation prompt', () => {
  const turns = createQueuedTurns({ id: 'user', text: 'Continue toward the active goal.' });
  expect(turns.user).toMatchObject({ role: 'user', text: 'Continue toward the active goal.' });
  expect(turns.assistant).toMatchObject({ role: 'assistant', streaming: true });
});
