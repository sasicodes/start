import { FakeAuthStorage, FakeModelRegistry } from './auth.js';
import { type CreateAgentSessionOptions, FakeAgentSession } from './session.js';
import { FakeSessionManager } from './session-manager.js';

export { FakeAuthStorage, FakeModelRegistry } from './auth.js';
export { FakeAgentSession, type FakeAgentSessionEvent } from './session.js';
export { FakeSessionManager } from './session-manager.js';
export {
  type FakeModel,
  getFakeSession,
  getFakeSessionManager,
  listFakeSessions,
  resetAgentRegistry,
  setAvailableModels,
  setModelRegistryError
} from './state.js';

export const createAgentSession = async (options: CreateAgentSessionOptions) => {
  const session = new FakeAgentSession(options);
  return { session };
};

export const SessionManager = FakeSessionManager;
export const AgentSession = FakeAgentSession;
export const AuthStorage = FakeAuthStorage;
export const ModelRegistry = FakeModelRegistry;
