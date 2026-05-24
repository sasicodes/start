import { vi } from 'vitest';

vi.mock('@earendil-works/pi-coding-agent', async () => {
  const fake = await import('./fakes/agent/index.js');
  return {
    AgentSession: fake.AgentSession,
    AuthStorage: fake.AuthStorage,
    ModelRegistry: fake.ModelRegistry,
    SessionManager: fake.SessionManager,
    createAgentSession: fake.createAgentSession
  };
});

vi.mock('electron', async () => {
  const fake = await import('./fakes/electron.js');
  return {
    default: fake.default,
    app: fake.app,
    shell: fake.shell,
    clipboard: fake.clipboard,
    nativeImage: fake.nativeImage
  };
});

vi.mock('@main/storage', () => import('./fakes/storage.js'));
vi.mock('@main/window', () => import('./fakes/window.js'));
vi.mock('@main/workspace/access', () => import('./fakes/workspace-access.js'));
vi.mock('@main/attachments', () => import('./fakes/attachments.js'));
vi.mock('@main/environment', () => ({ environment: { rendererUrl: undefined } }));
