import type { QueuedTurnStart } from '@preload/index';
import { createTurn, createUserTurn } from '@renderer/functions/chat';
import type { Turn } from '@renderer/utils/types';

interface QueuedTurns {
  assistant: Turn;
  user: Turn | null;
}

export const createQueuedTurns = (turn: QueuedTurnStart): QueuedTurns => ({
  assistant: { ...createTurn('assistant', ''), streaming: true },
  user: turn.kind !== 'continuation' ? createUserTurn(turn.text, turn.attachments ?? []) : null
});
