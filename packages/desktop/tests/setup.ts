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
    createFindTool: () => ({
      execute: async () => ({ content: [{ text: 'fallback find', type: 'text' }] })
    }),
    createGrepTool: () => ({
      execute: async () => ({ content: [{ text: 'fallback grep', type: 'text' }] })
    }),
    defineTool: <T>(tool: T) => tool,
    getLastAssistantUsage: () => {}
  };
});

vi.mock('electron', async () => {
  const fake = await import('./fakes/electron.js');
  return {
    default: fake.default,
    app: fake.app,
    shell: fake.shell,
    dialog: fake.dialog,
    clipboard: fake.clipboard,
    nativeImage: fake.nativeImage,
    BrowserWindow: fake.default.BrowserWindow,
    WebContentsView: fake.default.WebContentsView
  };
});

vi.mock('@main/utils/sink', () => ({ recordError: () => {} }));
vi.mock('@main/storage', () => import('./fakes/storage.js'));
vi.mock('@main/window', () => import('./fakes/window.js'));
vi.mock('@main/workspace/access', () => import('./fakes/workspace-access.js'));
vi.mock('@main/attachments', () => import('./fakes/attachments.js'));
vi.mock('@main/environment', () => ({
  environment: { rendererUrl: undefined },
  readEnvironmentValue: (name: string) => process.env[name]?.trim() || undefined
}));
vi.mock('@main/prompt/loader', () => ({ createStartResourceLoader: async () => ({}) }));
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
