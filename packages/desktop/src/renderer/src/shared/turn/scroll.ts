import { signal } from '@preact/signals';

interface BottomScrollIntent {
  kind: 'bottom';
  sequence: number;
}

interface TurnStartScrollIntent {
  kind: 'turn-start';
  sequence: number;
  turnId: string;
}

type TurnScrollIntent = BottomScrollIntent | TurnStartScrollIntent;

let nextScrollSequence = 0;

export const turnScrollIntentState = signal<TurnScrollIntent>({ kind: 'bottom', sequence: 0 });

export const scrollSessionToBottom = () => {
  nextScrollSequence += 1;
  turnScrollIntentState.value = { kind: 'bottom', sequence: nextScrollSequence };
};

export const scrollTurnToStart = (turnId: string) => {
  nextScrollSequence += 1;
  turnScrollIntentState.value = { kind: 'turn-start', sequence: nextScrollSequence, turnId };
};
