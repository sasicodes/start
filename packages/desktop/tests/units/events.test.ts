import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent';
import { chatEvent } from '@main/events';
import { describe, expect, it } from 'vitest';

describe('chat events', () => {
  it('hides settings changes from visible events', () => {
    const events = [
      { level: 'high', type: 'thinking_level_changed' },
      { name: 'Renamed', type: 'session_info_changed' }
    ] as AgentSessionEvent[];

    expect(events.map((event) => chatEvent(event))).toEqual([undefined, undefined]);
  });
});
