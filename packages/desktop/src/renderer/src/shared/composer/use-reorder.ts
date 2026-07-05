import { useEffect, useRef, useState } from 'preact/hooks';

export const reorder = (ids: string[], dragId: string, index: number): string[] => {
  const rest = ids.filter((id) => id !== dragId);
  if (rest.length === ids.length) return ids;

  rest.splice(Math.max(0, Math.min(index, rest.length)), 0, dragId);
  return rest;
};

export const useReorder = (ids: string[], onReorder: (orderedIds: string[]) => void) => {
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const [dragId, setDragId] = useState('');
  const listRef = useRef<HTMLUListElement>(null);
  const metricsRef = useRef({ top: 0, pitch: 1 });
  const indexRef = useRef(-1);
  const order = dragOrder ?? ids;

  useEffect(() => {
    setDragOrder(null);
  }, [ids]);

  useEffect(() => {
    if (!dragId) return;

    const move = (event: PointerEvent) => {
      const { top, pitch } = metricsRef.current;
      const index = Math.max(0, Math.min(Math.floor((event.clientY - top) / pitch), ids.length - 1));
      if (index === indexRef.current) return;

      indexRef.current = index;
      setDragOrder(reorder(ids, dragId, index));
    };

    const finish = () => {
      setDragId('');
      setDragOrder((current) => {
        if (!current?.some((id, index) => id !== ids[index])) return null;
        onReorder(current);
        return current;
      });
    };

    document.documentElement.classList.add('is-reordering');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      document.documentElement.classList.remove('is-reordering');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, [dragId, ids, onReorder]);

  const start = (id: string) => {
    const rows = listRef.current?.children;
    const first = rows?.[0]?.getBoundingClientRect();
    const second = rows?.[1]?.getBoundingClientRect();
    if (first) metricsRef.current = { top: first.top, pitch: second ? second.top - first.top : first.height };
    indexRef.current = ids.indexOf(id);
    setDragId(id);
    setDragOrder(ids);
  };

  return { order, dragId, listRef, start };
};
