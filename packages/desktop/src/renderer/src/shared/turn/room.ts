import { turnScrollIntentState } from '@renderer/shared/turn/scroll';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

interface UseTurnRoomOptions {
  turnCount: number;
}

const scrollToBottom = (element: HTMLElement) => {
  element.scrollTop = element.scrollHeight;
};

const scrollTopForTurnStart = (element: HTMLElement, turnId: string) => {
  const target = Array.from(element.querySelectorAll<HTMLElement>('[data-turn-id]')).find(
    (node) => node.dataset.turnId === turnId
  );
  if (!target) return null;

  const topInset = Number.parseFloat(getComputedStyle(element).paddingTop) || 0;
  const elementTop = element.getBoundingClientRect().top;
  const targetTop = target.getBoundingClientRect().top;
  return element.scrollTop + targetTop - elementTop - topInset;
};

const setRoomHeight = (room: HTMLDivElement, height: number) => {
  const value = `${height}px`;
  if (room.style.height !== value) room.style.height = value;
};

export const useTurnRoom = ({ turnCount }: UseTurnRoomOptions) => {
  const frameRef = useRef(0);
  const roomTurnIdRef = useRef('');
  const positionedRef = useRef(false);
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

  const syncRoom = useCallback((scroll = false) => {
    const room = roomRef.current;
    const element = scrollRef.current;
    const turnId = roomTurnIdRef.current;
    if (!room || !element || !turnId) return;

    const targetScrollTop = scrollTopForTurnStart(element, turnId);
    if (targetScrollTop === null) return;

    const alignedScrollTop = Math.ceil(targetScrollTop);
    const naturalScrollHeight = element.scrollHeight - room.offsetHeight;
    const nextHeight = Math.max(0, alignedScrollTop + element.clientHeight - naturalScrollHeight);
    setRoomHeight(room, nextHeight);

    if (scroll) element.scrollTop = alignedScrollTop;
  }, []);

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
    if (!element || turnCount === 0) {
      roomTurnIdRef.current = '';
      setRoomTurnId('');
      finishPositioning();
      return;
    }

    if (scrollIntent.kind === 'bottom') {
      roomTurnIdRef.current = '';
      setRoomTurnId('');
      scrollToBottom(element);
      finishPositioning();
      return;
    }

    roomTurnIdRef.current = scrollIntent.turnId;
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

  return {
    roomRef,
    scrollRef,
    positioned,
    contentRef,
    roomVisible: Boolean(roomTurnId)
  };
};
