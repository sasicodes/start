import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent';

export type ChatEvent = {
  name: string;
};

export const chatEvent = (event: AgentSessionEvent): ChatEvent => {
  return { name: event.type };
};
