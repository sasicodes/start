type Handler = (...args: unknown[]) => unknown;

export interface FakeWebContents {
  send: (channel: string, ...args: unknown[]) => void;
  events: { channel: string; args: unknown[] }[];
}

export const createFakeWebContents = (): FakeWebContents => {
  const events: { channel: string; args: unknown[] }[] = [];
  return {
    events,
    send: (channel: string, ...args: unknown[]) => {
      events.push({ channel, args });
    }
  };
};

export const eventsByChannel = (webContents: FakeWebContents, channel: string) =>
  webContents.events.filter((event) => event.channel === channel);

export const lastEvent = (webContents: FakeWebContents, channel: string) => {
  const matches = eventsByChannel(webContents, channel);
  return matches.length > 0 ? matches[matches.length - 1] : undefined;
};

export const clearEvents = (webContents: FakeWebContents) => {
  webContents.events.length = 0;
};

export const shell = {
  openExternal: async (_url: string) => {}
};

export const clipboard = {
  readImage: () => ({ isEmpty: () => true, toPNG: () => Buffer.alloc(0) })
};

export const nativeImage = {
  createFromBuffer: (_buffer: Buffer) => null
};

export const app = {
  isPackaged: false,
  startAccessingSecurityScopedResource: (_bookmark: string) => () => {}
};

const fakeElectronModule = {
  app,
  shell,
  clipboard,
  nativeImage,
  ipcMain: {
    handle: (_channel: string, _handler: Handler) => {},
    on: (_channel: string, _handler: Handler) => {}
  }
};

export default fakeElectronModule;
