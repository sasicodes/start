import { useState } from 'preact/hooks';

interface ReorderState {
  dragId: string;
  overId: string;
}

export const moveId = (ids: string[], dragId: string, overId: string): string[] => {
  const from = ids.indexOf(dragId);
  const to = ids.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return ids;

  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, dragId);
  return next;
};

export const useReorder = (ids: string[], onReorder: (orderedIds: string[]) => void) => {
  const [state, setState] = useState<ReorderState | null>(null);

  const order = state ? moveId(ids, state.dragId, state.overId) : ids;

  const start = (id: string) => setState({ dragId: id, overId: id });

  const enter = (id: string) =>
    setState((current) => (current && current.overId !== id ? { ...current, overId: id } : current));

  const drop = () => {
    if (state && order !== ids) onReorder(order);
    setState(null);
  };

  return { order, dragId: state?.dragId ?? '', start, enter, drop };
};
