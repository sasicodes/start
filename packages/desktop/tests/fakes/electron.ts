type Handler = (...args: unknown[]) => unknown;
type WindowEvent = 'closed';

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
  writeImage: (_image: unknown) => {},
  readImage: () => ({ isEmpty: () => true, toPNG: () => Buffer.alloc(0) })
};

export const nativeImage = {
  createFromBuffer: (_buffer: Buffer) => null
};

export const app = {
  isPackaged: false,
  getVersion: () => '0.0.0-test',
  startAccessingSecurityScopedResource: (_bookmark: string) => () => {}
};

interface FakeBrowserBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FakeWindowOpenInput {
  url: string;
}

interface FakeWindowOpenResult {
  action: 'allow' | 'deny';
}

type WindowOpenHandler = (input: FakeWindowOpenInput) => FakeWindowOpenResult;

export interface FakeBrowserWebContents extends FakeWebContents {
  closed: boolean;
  capturePage: () => Promise<{ isEmpty: () => boolean }>;
  close: () => void;
  emit: (event: string, ...args: unknown[]) => void;
  executeJavaScript: (script: string, userGesture?: boolean) => Promise<unknown>;
  focus: () => void;
  focusCount: number;
  getTitle: () => string;
  getURL: () => string;
  getZoomFactor: () => number;
  inputEvents: unknown[];
  isLoading: () => boolean;
  loadURL: (url: string) => Promise<void>;
  navigationHistory: {
    canGoBack: () => boolean;
    canGoForward: () => boolean;
    goBack: () => void;
    goForward: () => void;
  };
  off: (event: string, handler: Handler) => void;
  on: (event: string, handler: Handler) => void;
  reload: () => void;
  sendInputEvent: (event: unknown) => void;
  setWindowOpenHandler: (handler: WindowOpenHandler) => void;
  stop: () => void;
}

export interface FakeContentView {
  children: FakeWebContentsView[];
  addChildView: (view: FakeWebContentsView) => void;
  removeChildView: (view: FakeWebContentsView) => void;
}

export interface FakeBrowserWindow {
  contentView: FakeContentView;
  destroyed: boolean;
  webContents: FakeBrowserWebContents;
  close: () => void;
  isDestroyed: () => boolean;
  off: (event: WindowEvent, handler: () => void) => void;
  on: (event: WindowEvent, handler: () => void) => void;
}

const windowsByWebContents = new Map<FakeBrowserWebContents, FakeBrowserWindow>();

const createFakeBrowserWebContents = (): FakeBrowserWebContents => {
  const base = createFakeWebContents();
  const handlersByEvent = new Map<string, Set<Handler>>();
  const webContents: FakeBrowserWebContents = {
    ...base,
    closed: false,
    capturePage: async () => ({ isEmpty: () => false }),
    close: () => {
      webContents.closed = true;
    },
    emit: (event, ...args) => {
      for (const handler of handlersByEvent.get(event) ?? []) handler(...args);
    },
    executeJavaScript: async (_script: string, _userGesture?: boolean) => ({ ok: true }),
    focus: () => {
      webContents.focusCount += 1;
    },
    focusCount: 0,
    getTitle: () => '',
    getURL: () => '',
    getZoomFactor: () => 1,
    inputEvents: [],
    isLoading: () => false,
    loadURL: async (_url: string) => {},
    navigationHistory: {
      canGoBack: () => false,
      canGoForward: () => false,
      goBack: () => {},
      goForward: () => {}
    },
    off: (event, handler) => {
      handlersByEvent.get(event)?.delete(handler);
    },
    on: (event, handler) => {
      const handlers = handlersByEvent.get(event) ?? new Set<Handler>();
      handlers.add(handler);
      handlersByEvent.set(event, handlers);
    },
    reload: () => {},
    sendInputEvent: (event) => {
      webContents.inputEvents.push(event);
    },
    setWindowOpenHandler: (_handler: WindowOpenHandler) => {},
    stop: () => {}
  };
  return webContents;
};

export class FakeWebContentsView {
  bounds: FakeBrowserBounds[] = [];
  backgroundColor = '';
  webContents = createFakeBrowserWebContents();

  setBackgroundColor = (color: string) => {
    this.backgroundColor = color;
  };

  setBounds = (bounds: FakeBrowserBounds) => {
    this.bounds.push(bounds);
  };
}

export const createFakeBrowserWindow = (): FakeBrowserWindow => {
  const closedHandlers = new Set<() => void>();
  const contentView: FakeContentView = {
    children: [],
    addChildView: (view) => {
      contentView.children.push(view);
    },
    removeChildView: (view) => {
      contentView.children = contentView.children.filter((child) => child !== view);
    }
  };
  const window: FakeBrowserWindow = {
    contentView,
    destroyed: false,
    webContents: createFakeBrowserWebContents(),
    close: () => {
      window.destroyed = true;
      for (const handler of closedHandlers) handler();
    },
    isDestroyed: () => window.destroyed,
    off: (_event, handler) => {
      closedHandlers.delete(handler);
    },
    on: (_event, handler) => {
      closedHandlers.add(handler);
    }
  };
  windowsByWebContents.set(window.webContents, window);
  return window;
};

export const resetFakeBrowserWindows = () => {
  windowsByWebContents.clear();
};

const fakeElectronModule = {
  app,
  shell,
  clipboard,
  nativeImage,
  BrowserWindow: {
    fromWebContents: (webContents: FakeBrowserWebContents) => windowsByWebContents.get(webContents) ?? null
  },
  WebContentsView: FakeWebContentsView,
  ipcMain: {
    handle: (_channel: string, _handler: Handler) => {},
    on: (_channel: string, _handler: Handler) => {}
  }
};

export default fakeElectronModule;
