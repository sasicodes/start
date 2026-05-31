import type { EffortLevel, SessionNotice } from '@main/types';

export interface StartState {
  lastWorkspace?: string;
  composerShortcut: string;
  selectedModelKey?: string;
  solidWindowBackground: boolean;
  selectedThinkingLevel: EffortLevel;
  sessionNotices?: Record<string, SessionNotice>;
  workspaceBookmarks?: Record<string, string>;
}

const defaultStartState: StartState = {
  composerShortcut: 'Control+Space',
  solidWindowBackground: false,
  selectedThinkingLevel: 'medium'
};

let currentState: StartState = { ...defaultStartState };

export const resetStorage = (initial?: Partial<StartState>) => {
  currentState = { ...defaultStartState, ...(initial ?? {}) };
};

export const getStorageSnapshot = (): StartState => structuredClone(currentState);

export const readStartState = (): StartState => structuredClone(currentState);

export const writeStartState = (state: StartState): StartState => {
  currentState = structuredClone(state);
  return structuredClone(currentState);
};

export const updateStartState = (patch: Partial<StartState>): StartState => {
  currentState = { ...currentState, ...patch };
  return structuredClone(currentState);
};

export const parseStartState = (value: unknown): StartState => {
  if (!value || typeof value !== 'object') return defaultStartState;
  return { ...defaultStartState, ...(value as Partial<StartState>) };
};

export const startDir = () => '/tmp/start-test';
export const startCacheDir = () => '/tmp/start-test/cache';
export const startLogPath = () => '/tmp/start-test/logs/app.log';
export const startStatePath = () => '/tmp/start-test/state.json';
