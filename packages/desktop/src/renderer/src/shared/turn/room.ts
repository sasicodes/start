import { turnScrollIntentState } from '@renderer/shared/turn/scroll';
import type { VirtualHandle } from '@renderer/ui/virtual';
import type { RefObject } from 'preact';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

interface UseTurnRoomOptions {
  streaming: boolean;
  turnCount: number;
  turnIndex: (turnId: string) => number;
  virtualRef: RefObject<VirtualHandle | null>;
}

export const shouldFreezeRoom = (streaming: boolean, hasRoomTurn: boolean) => !streaming && hasRoomTurn;

interface TurnStartScrollTop {
  value: number;
  measured: boolean;
}

const scrollToBottom = (element: HTMLElement) => {
  element.scrollTop = element.scrollHeight;
};

const scrollTopForTurnStart = (
  element: HTMLElement,
  turnId: string,
  fallback: number | null
): TurnStartScrollTop | null => {
  const target = Array.from(element.querySelectorAll<HTMLElement>('[data-turn-id]')).find(
    (node) => node.dataset.turnId === turnId
  );
  if (!target) return fallback === null ? null : { value: fallback, measured: false };

  const topInset = Number.parseFloat(getComputedStyle(element).paddingTop) || 0;
  const elementTop = element.getBoundingClientRect().top;
  const targetTop = target.getBoundingClientRect().top;
  return { value: element.scrollTop + targetTop - elementTop - topInset, measured: true };
};

const setRoomHeight = (room: HTMLDivElement, height: number) => {
  const value = `${height}px`;
  if (room.style.height !== value) room.style.height = value;
};

export const useTurnRoom = ({ streaming, turnCount, turnIndex, virtualRef }: UseTurnRoomOptions) => {
  const frameRef = useRef(0);
  const frozenRef = useRef(false);
  const roomTurnIdRef = useRef('');
  const positionedRef = useRef(false);
  const alignmentPendingRef = useRef(false);
  const scrollRef = useRef<HTMLElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollIntent = turnScrollIntentState.value;
  const [roomTurnId, setRoomTurnId] = useState('');
  const [positioned, setPositioned] = useState(false);

  const finishPositioning = useCallback(() => {
    if (positionedRef.current) return;

    positionedRef.current = true;
    setPositioned(true);
  }, []);

  const syncRoom = useCallback(
    (scroll = false) => {
      const room = roomRef.current;
      const element = scrollRef.current;
      const turnId = roomTurnIdRef.current;
      if (!room || !element || !turnId || frozenRef.current) return;

      const index = turnIndex(turnId);
      const fallback = index >= 0 ? (virtualRef.current?.scrollTopForIndex(index) ?? null) : null;
      const targetScrollTop = scrollTopForTurnStart(element, turnId, fallback);
      if (targetScrollTop === null) return;

      const alignedScrollTop = Math.ceil(targetScrollTop.value);
      const naturalScrollHeight = element.scrollHeight - room.offsetHeight;
      const nextHeight = Math.max(0, alignedScrollTop + element.clientHeight - naturalScrollHeight);
      setRoomHeight(room, nextHeight);

      if (scroll || alignmentPendingRef.current) element.scrollTop = alignedScrollTop;
      if (targetScrollTop.measured) alignmentPendingRef.current = false;
    },
    [turnIndex, virtualRef]
  );

  const scheduleRoomSync = useCallback(
    (scroll = false) => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        syncRoom(scroll);
        finishPositioning();
      });
    },
    [syncRoom, finishPositioning]
  );

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element || !turnCount) {
      roomTurnIdRef.current = '';
      frozenRef.current = false;
      alignmentPendingRef.current = false;
      setRoomTurnId('');
      finishPositioning();
      return;
    }

    if (scrollIntent.kind === 'bottom') {
      roomTurnIdRef.current = '';
      frozenRef.current = false;
      alignmentPendingRef.current = false;
      setRoomTurnId('');
      scrollToBottom(element);
      finishPositioning();
      return;
    }

    roomTurnIdRef.current = scrollIntent.turnId;
    frozenRef.current = false;
    alignmentPendingRef.current = true;
    setRoomTurnId(scrollIntent.turnId);
    scheduleRoomSync(true);
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    };
  }, [turnCount, scrollIntent, scheduleRoomSync, finishPositioning]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || !roomTurnId) return;

    const observer = new ResizeObserver(() => scheduleRoomSync());
    observer.observe(content);
    scheduleRoomSync();
    return () => observer.disconnect();
  }, [roomTurnId, scheduleRoomSync]);

  useEffect(() => {
    if (shouldFreezeRoom(streaming, Boolean(roomTurnIdRef.current))) frozenRef.current = true;
  }, [streaming]);

  const onVirtualRangeChange = useCallback(() => {
    if (!roomTurnIdRef.current) return;
    scheduleRoomSync();
  }, [scheduleRoomSync]);

  return {
    roomRef,
    scrollRef,
    positioned,
    contentRef,
    onVirtualRangeChange,
    roomVisible: Boolean(roomTurnId)
  };
};
