import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { EffortLevel } from '@main/types';

export type StartState = {
  composerShortcut: string;
  lastWorkspace?: string;
  selectedModelKey?: string;
  workspaceBookmarks?: Record<string, string>;
  selectedThinkingLevel: EffortLevel;
};

const defaultStartState = {
  composerShortcut: 'Control+Space',
  selectedThinkingLevel: 'medium'
} satisfies StartState;

export const startDir = () => join(homedir(), '.start');
export const startCacheDir = () => join(startDir(), 'cache');
export const startLogPath = () => join(startDir(), 'logs', 'app.log');
export const startStatePath = () => join(startDir(), 'state.json');

const cleanString = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

const cleanStringRecord = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const entries = Object.entries(value).flatMap(([key, entry]) => {
    const cleanKey = cleanString(key);
    const cleanEntry = cleanString(entry);
    return cleanKey && cleanEntry ? ([[cleanKey, cleanEntry]] as const) : [];
  });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const cleanThinkingLevel = (value: unknown): EffortLevel => {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'xhigh') return value;
  return defaultStartState.selectedThinkingLevel;
};

export const parseStartState = (value: unknown): StartState => {
  if (!value || typeof value !== 'object') return defaultStartState;
  const state = value as Partial<StartState>;
  const lastWorkspace = cleanString(state.lastWorkspace);
  const selectedModelKey = cleanString(state.selectedModelKey);
  const workspaceBookmarks = cleanStringRecord(state.workspaceBookmarks);
  return {
    composerShortcut: cleanString(state.composerShortcut) ?? defaultStartState.composerShortcut,
    selectedThinkingLevel: cleanThinkingLevel(state.selectedThinkingLevel),
    ...(lastWorkspace ? { lastWorkspace } : {}),
    ...(selectedModelKey ? { selectedModelKey } : {}),
    ...(workspaceBookmarks ? { workspaceBookmarks } : {})
  };
};

export const readStartState = (): StartState => {
  try {
    return parseStartState(JSON.parse(readFileSync(startStatePath(), 'utf8')));
  } catch {
    return defaultStartState;
  }
};

export const writeStartState = (state: StartState): StartState => {
  const nextState = parseStartState(state);
  const path = startStatePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
  return nextState;
};

export const updateStartState = (patch: Partial<StartState>): StartState =>
  writeStartState({ ...readStartState(), ...patch });

export const migrateLegacySettings = (legacyPath: string): StartState => {
  const current = readStartState();
  if (existsSync(startStatePath())) return current;

  try {
    const legacySettings = JSON.parse(readFileSync(legacyPath, 'utf8')) as { composerShortcut?: unknown };
    const composerShortcut = cleanString(legacySettings.composerShortcut);
    return writeStartState({
      ...current,
      ...(composerShortcut ? { composerShortcut } : {})
    });
  } catch {
    return writeStartState(current);
  }
};
