export interface DeltaChunk {
  kind: 'text' | 'thinking';
  delta: string;
  senderDelta: string;
}

export interface DeltaCoalescer {
  flush: () => void;
  push: (kind: 'text' | 'thinking', delta: string, sender: boolean) => void;
}

export const createDeltaCoalescer = (flushMs: number, onFlush: (chunks: DeltaChunk[]) => void): DeltaCoalescer => {
  let timer: NodeJS.Timeout | null = null;
  let pending: DeltaChunk[] = [];

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    if (pending.length === 0) return;
    const chunks = pending;
    pending = [];
    onFlush(chunks);
  };

  const push = (kind: 'text' | 'thinking', delta: string, sender: boolean) => {
    if (!delta) return;

    const last = pending.at(-1);
    if (last && last.kind === kind) {
      last.delta += delta;
      if (sender) last.senderDelta += delta;
    } else {
      pending.push({ kind, delta, senderDelta: sender ? delta : '' });
    }

    if (!timer) timer = setTimeout(flush, flushMs);
  };

  return { push, flush };
};
