import { useEffect, useRef, useState } from 'preact/hooks';

export const moveId = (ids: string[], dragId: string, overId: string): string[] => {
  const from = ids.indexOf(dragId);
  const to = ids.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return ids;

  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, dragId);
  return next;
};

const targetIndex = (list: HTMLElement, pointerY: number): number => {
  const items = [...list.children] as HTMLElement[];
  for (let index = 0; index < items.length; index += 1) {
    const rect = items[index]?.getBoundingClientRect();
    if (rect && pointerY < rect.top + rect.height / 2) return index;
  }
  return items.length - 1;
};

export const useReorder = (ids: string[], onReorder: (orderedIds: string[]) => void) => {
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const [dragId, setDragId] = useState('');
  const listRef = useRef<HTMLUListElement>(null);
  const order = dragOrder ?? ids;

  useEffect(() => {
    setDragOrder(null);
  }, [ids]);

  useEffect(() => {
    if (!dragId) return;

    const move = (event: PointerEvent) => {
      const list = listRef.current;
      if (!list) return;

      setDragOrder((current) => {
        const base = current ?? ids;
        const next = base[targetIndex(list, event.clientY)];
        return next ? moveId(base, dragId, next) : base;
      });
    };

    const finish = () => {
      setDragId('');
      setDragOrder((current) => {
        if (!current?.some((id, index) => id !== ids[index])) return null;
        onReorder(current);
        return current;
      });
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, [dragId, ids, onReorder]);

  const start = (id: string) => {
    setDragId(id);
    setDragOrder(ids);
  };

  return { order, dragId, listRef, start };
};
