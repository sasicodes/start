import { readTurns, updateTurns } from '@renderer/state/chat';
import type { Turn } from '@renderer/utils/types';
import { useCallback, useRef, useState } from 'preact/hooks';

export type TurnUpdater = (updater: (current: Turn[]) => Turn[]) => void;

const previousUserText = (turns: Turn[]) => {
  for (let index = turns.length - 1; index >= 0; index--) {
    const turn = turns[index];
    if (turn?.role === 'user') return turn.text;
  }

  return '';
};

export const useTurnSummary = () => {
  const [turnCount, setTurnCount] = useState(() => readTurns().length);
  const [previousUserTurn, setPreviousUserTurn] = useState(() => previousUserText(readTurns()));
  const turnCountRef = useRef(turnCount);
  const previousUserTurnRef = useRef(previousUserTurn);

  const syncTurnSummary = useCallback((nextTurns: Turn[]) => {
    const nextTurnCount = nextTurns.length;
    if (turnCountRef.current !== nextTurnCount) {
      turnCountRef.current = nextTurnCount;
      setTurnCount(nextTurnCount);
    }

    const nextPreviousUserTurn = previousUserText(nextTurns);
    if (previousUserTurnRef.current !== nextPreviousUserTurn) {
      previousUserTurnRef.current = nextPreviousUserTurn;
      setPreviousUserTurn(nextPreviousUserTurn);
    }
  }, []);

  const setTurns = useCallback<TurnUpdater>(
    (updater) => {
      syncTurnSummary(updateTurns(updater));
    },
    [syncTurnSummary]
  );

  return {
    setTurns,
    turnCount,
    previousUserTurn
  };
};
