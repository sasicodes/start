import type { EffortLevel, SessionNotice } from '@main/types';

export interface MobileRelaySettings {
  desktopId: string;
  enabled: boolean;
  relayToken: string;
  relayUrl: string;
}

export interface StartState {
  lastWorkspace?: string;
  mobileRelay: MobileRelaySettings;
  composerShortcut: string;
  selectedModelKey?: string;
  solidWindowBackground: boolean;
  selectedThinkingLevel: EffortLevel;
  workspaceHistory?: Record<string, number>;
  workspaceBookmarks?: Record<string, string>;
  sessionNotices?: Record<string, SessionNotice>;
}

const defaultStartState: StartState = {
  mobileRelay: {
    enabled: false,
    desktopId: '',
    relayUrl: '',
    relayToken: ''
  },
  solidWindowBackground: false,
  selectedThinkingLevel: 'medium',
  composerShortcut: 'Control+Space'
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
