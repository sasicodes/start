export interface BroadcastEvent {
  channel: string;
  args: unknown[];
}

const broadcasts: BroadcastEvent[] = [];

export const sendToRendererWindows = (channel: string, ...args: unknown[]) => {
  broadcasts.push({ args, channel });
};

export const sendToMainWindow = (channel: string, ...args: unknown[]) => {
  broadcasts.push({ args, channel });
};

export const broadcastedEvents = () => [...broadcasts];

export const broadcastsByChannel = (channel: string) => broadcasts.filter((event) => event.channel === channel);

export const resetBroadcasts = () => {
  broadcasts.length = 0;
};
