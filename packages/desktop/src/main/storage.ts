import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { EffortLevel, SessionNotice } from '@main/types';

export type StartState = {
  composerShortcut: string;
  lastWorkspace?: string;
  selectedModelKey?: string;
  sessionNotices?: Record<string, SessionNotice>;
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

const cleanString = (value: unknown) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return;
};

const cleanStringRecord = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;

  const entries = Object.entries(value).flatMap(([key, entry]) => {
    const cleanKey = cleanString(key);
    const cleanEntry = cleanString(entry);
    return cleanKey && cleanEntry ? ([[cleanKey, cleanEntry]] as const) : [];
  });

  if (entries.length > 0) return Object.fromEntries(entries);
  return;
};

const cleanSessionNotices = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;

  const notices: Record<string, SessionNotice> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const notice = entry as Partial<SessionNotice>;
    const sessionId = cleanString(notice.sessionId) ?? cleanString(key);
    const workspacePath = cleanString(notice.workspacePath);
    const seenAt = typeof notice.seenAt === 'number' ? notice.seenAt : null;
    const createdAt = typeof notice.createdAt === 'number' ? notice.createdAt : Date.now();
    if (!sessionId || !workspacePath) continue;
    if (notice.kind !== 'completed' && notice.kind !== 'failed') continue;
    notices[sessionId] = {
      sessionId,
      createdAt,
      workspacePath,
      kind: notice.kind,
      ...(seenAt ? { seenAt } : {})
    };
  }

  if (Object.keys(notices).length > 0) return notices;
  return;
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
  const sessionNotices = cleanSessionNotices(state.sessionNotices);
  const workspaceBookmarks = cleanStringRecord(state.workspaceBookmarks);
  return {
    composerShortcut: cleanString(state.composerShortcut) ?? defaultStartState.composerShortcut,
    selectedThinkingLevel: cleanThinkingLevel(state.selectedThinkingLevel),
    ...(lastWorkspace ? { lastWorkspace } : {}),
    ...(selectedModelKey ? { selectedModelKey } : {}),
    ...(sessionNotices ? { sessionNotices } : {}),
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
