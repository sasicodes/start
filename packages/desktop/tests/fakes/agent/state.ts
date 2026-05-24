import type { FakeAgentSession } from './session.js';
import type { FakeSessionManager } from './session-manager.js';

export interface FakeModel {
  id: string;
  name: string;
  provider: string;
  reasoning: boolean;
  contextWindow: number;
  input: ('text' | 'image')[];
  thinkingLevelMap?: Record<string, string | null>;
}

const defaultModel: FakeModel = {
  reasoning: true,
  input: ['text', 'image'],
  contextWindow: 200000,
  id: 'claude-opus-4-7',
  name: 'Claude Opus 4 7',
  provider: 'anthropic'
};

export const sessionRegistry = new Map<string, FakeAgentSession>();
export const sessionManagerRegistry = new Map<string, FakeSessionManager>();
export const sessionStore = new Map<string, FakeSessionManager>();

let modelRegistryError: string | undefined;
let availableModels: FakeModel[] = [defaultModel];

export const setAvailableModels = (models: FakeModel[]) => {
  availableModels = models;
};

export const setModelRegistryError = (error: string | undefined) => {
  modelRegistryError = error;
};

export const getAvailableModels = (): FakeModel[] => availableModels;

export const getModelRegistryError = (): string | undefined => modelRegistryError;

export const resetAgentRegistry = () => {
  sessionRegistry.clear();
  sessionManagerRegistry.clear();
  sessionStore.clear();
  availableModels = [defaultModel];
  modelRegistryError = undefined;
};

export const getFakeSession = (id: string) => sessionRegistry.get(id);

export const getFakeSessionManager = (id: string) => sessionManagerRegistry.get(id);

export const listFakeSessions = () => [...sessionRegistry.values()];
