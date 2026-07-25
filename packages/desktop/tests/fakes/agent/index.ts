import { FakeModelRegistry, FakeModelRuntime, FakeSettingsManager } from './auth.js';
import { type CreateAgentSessionOptions, FakeAgentSession } from './session.js';
import { FakeSessionManager } from './session-manager.js';

export { FakeModelRegistry, FakeModelRuntime, FakeSettingsManager } from './auth.js';
export { FakeAgentSession, type FakeAgentSessionEvent } from './session.js';
export { FakeSessionManager } from './session-manager.js';
export {
  type FakeModel,
  fakeModelDefaults,
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
export const ModelRegistry = FakeModelRegistry;
export const ModelRuntime = FakeModelRuntime;
export const SettingsManager = FakeSettingsManager;
