import { sameOrder, userTurnTexts } from '@renderer/shared/chat/recall';
import { readTurns, updateTurns } from '@renderer/state/chat';
import type { Turn } from '@renderer/utils/types';
import { useCallback, useRef, useState } from 'preact/hooks';

export type TurnUpdater = (updater: (current: Turn[]) => Turn[]) => void;

export const useTurnSummary = () => {
  const [turnCount, setTurnCount] = useState(() => readTurns().length);
  const [userTurns, setUserTurns] = useState(() => userTurnTexts(readTurns()));
  const turnCountRef = useRef(turnCount);
  const userTurnsRef = useRef(userTurns);

  const syncTurnSummary = useCallback((nextTurns: Turn[]) => {
    const nextTurnCount = nextTurns.length;
    if (turnCountRef.current !== nextTurnCount) {
      turnCountRef.current = nextTurnCount;
      setTurnCount(nextTurnCount);
    }

    const nextUserTurns = userTurnTexts(nextTurns);
    if (!sameOrder(userTurnsRef.current, nextUserTurns)) {
      userTurnsRef.current = nextUserTurns;
      setUserTurns(nextUserTurns);
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
    turnCountRef,
    userTurns
  };
};
