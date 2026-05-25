import { vi } from 'vitest';

vi.mock('@earendil-works/pi-coding-agent', async () => {
  const fake = await import('./fakes/agent/index.js');
  return {
    AgentSession: fake.AgentSession,
    AuthStorage: fake.AuthStorage,
    ModelRegistry: fake.ModelRegistry,
    SessionManager: fake.SessionManager,
    SettingsManager: fake.SettingsManager,
    createAgentSession: fake.createAgentSession,
    defineTool: <T>(tool: T) => tool,
    getLastAssistantUsage: () => undefined
  };
});

vi.mock('electron', async () => {
  const fake = await import('./fakes/electron.js');
  return {
    default: fake.default,
    app: fake.app,
    shell: fake.shell,
    clipboard: fake.clipboard,
    nativeImage: fake.nativeImage,
    BrowserWindow: fake.default.BrowserWindow,
    WebContentsView: fake.default.WebContentsView
  };
});

vi.mock('@main/storage', () => import('./fakes/storage.js'));
vi.mock('@main/window', () => import('./fakes/window.js'));
vi.mock('@main/workspace/access', () => import('./fakes/workspace-access.js'));
vi.mock('@main/attachments', () => import('./fakes/attachments.js'));
vi.mock('@main/environment', () => ({ environment: { rendererUrl: undefined } }));
vi.mock('@main/resource-loader', () => ({ createStartResourceLoader: async () => ({}) }));
vi.mock('@main/db', () => {
  const stub = {
    get: () => undefined,
    run: () => undefined,
    all: () => []
  };
  return {
    openStartDb: () => ({
      prepare: () => stub,
      exec: () => undefined,
      close: () => undefined
    }),
    runStartTransaction: <T>(fn: () => T) => fn(),
    closeStartDb: () => undefined
  };
});
