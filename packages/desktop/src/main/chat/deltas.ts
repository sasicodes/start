export interface DeltaFlush {
  text: string;
  thinking: string;
  senderText: string;
  senderThinking: string;
}

export interface DeltaCoalescer {
  flush: () => void;
  push: (kind: 'text' | 'thinking', delta: string, sender: boolean) => void;
}

const emptyFlush = (): DeltaFlush => ({ text: '', thinking: '', senderText: '', senderThinking: '' });

export const createDeltaCoalescer = (flushMs: number, onFlush: (deltas: DeltaFlush) => void): DeltaCoalescer => {
  let timer: NodeJS.Timeout | null = null;
  let pending = emptyFlush();

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    const { text, thinking, senderText, senderThinking } = pending;
    if (!text && !thinking && !senderText && !senderThinking) return;
    pending = emptyFlush();
    onFlush({ text, thinking, senderText, senderThinking });
  };

  const push = (kind: 'text' | 'thinking', delta: string, sender: boolean) => {
    if (!delta) return;

    if (kind === 'text') {
      pending.text += delta;
      if (sender) pending.senderText += delta;
    } else {
      pending.thinking += delta;
      if (sender) pending.senderThinking += delta;
    }

    if (!timer) timer = setTimeout(flush, flushMs);
  };

  return { push, flush };
};
