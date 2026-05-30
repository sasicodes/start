import type { ChatEvent } from '@preload/index';

export type StreamEvent = { kind: 'thinking'; delta: string } | { kind: 'detail'; event: ChatEvent };

interface StreamHandlers {
  onThinking: (delta: string) => void;
  onDetails: (events: ChatEvent[]) => void;
}

export const drainStreamBuffer = (events: StreamEvent[], handlers: StreamHandlers) => {
  let index = 0;
  while (index < events.length) {
    const head = events[index];
    if (!head) return;
    if (head.kind === 'thinking') {
      let delta = head.delta;
      index++;
      while (index < events.length) {
        const next = events[index];
        if (!next || next.kind !== 'thinking') break;
        delta += next.delta;
        index++;
      }
      if (delta) handlers.onThinking(delta);
    } else {
      const batch: ChatEvent[] = [head.event];
      index++;
      while (index < events.length) {
        const next = events[index];
        if (!next || next.kind !== 'detail') break;
        batch.push(next.event);
        index++;
      }
      handlers.onDetails(batch);
    }
  }
};
