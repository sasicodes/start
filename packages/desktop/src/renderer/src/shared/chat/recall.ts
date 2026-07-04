import type { QueuedMessage } from '@preload/index';
import type { Turn } from '@renderer/utils/types';

export const userTurnTexts = (turns: Turn[]): string[] => {
  const texts: string[] = [];
  for (let index = turns.length - 1; index >= 0; index--) {
    const turn = turns[index];
    if (turn?.role === 'user' && turn.text) texts.push(turn.text);
  }
  return texts;
};

export const sameOrder = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

export const buildRecallList = (queued: QueuedMessage[], userTurns: string[]): string[] => {
  const queuedTexts = [...queued]
    .reverse()
    .map((message) => message.text)
    .filter((text) => text.length > 0);
  return [...queuedTexts, ...userTurns];
};

export interface RecallStep {
  index: number;
  text: string;
}

export const recallOlder = (entries: string[], index: number): RecallStep | null => {
  const next = index + 1;
  if (next >= entries.length) return null;
  return { index: next, text: entries[next] ?? '' };
};

export const recallNewer = (entries: string[], index: number): RecallStep | null => {
  if (index < 0) return null;
  const next = index - 1;
  return { index: next, text: next < 0 ? '' : (entries[next] ?? '') };
};
