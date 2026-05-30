import { join } from 'node:path';
import { baseDir } from '@main/application';
import { openStartDb, runStartTransaction, type StartStatement } from '@main/db';
import { readRequiredString, type SqliteRow } from '@main/sqlite-row';
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
  selectedThinkingLevel: 'high'
} satisfies StartState;

export const startDir = () => baseDir;
export const startCacheDir = () => join(startDir(), 'cache');
export const startLogPath = () => join(startDir(), 'logs', 'app.log');

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

const stateKey = {
  composerShortcut: 'composer_shortcut',
  lastWorkspace: 'last_workspace',
  selectedModelKey: 'selected_model_key',
  selectedThinkingLevel: 'selected_thinking_level',
  sessionNotices: 'session_notices',
  workspaceBookmarks: 'workspace_bookmarks'
} as const satisfies Record<keyof StartState, string>;

type StateRow = { key: string; value_json: string };

interface AppStateStatements {
  selectAll: StartStatement;
  upsert: StartStatement;
  remove: StartStatement;
}

let cachedStatements: AppStateStatements | undefined;

const statements = (): AppStateStatements => {
  if (cachedStatements) return cachedStatements;
  const db = openStartDb();
  cachedStatements = {
    selectAll: db.prepare('SELECT key, value_json FROM app_state'),
    upsert: db.prepare(
      'INSERT INTO app_state (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at'
    ),
    remove: db.prepare('DELETE FROM app_state WHERE key = ?')
  };
  return cachedStatements;
};

const toStateRow = (row: SqliteRow): StateRow => ({
  key: readRequiredString(row, 'key'),
  value_json: readRequiredString(row, 'value_json')
});

const readAllRows = (): StateRow[] => statements().selectAll.all().map(toStateRow);

const writeRow = (key: string, value: unknown) => statements().upsert.run(key, JSON.stringify(value), Date.now());

const deleteRow = (key: string) => statements().remove.run(key);

const writeOrDeleteRow = (key: string, value: unknown) => {
  if (value === undefined || value === null) {
    deleteRow(key);
    return;
  }
  writeRow(key, value);
};

const rowsToRaw = (rows: StateRow[]): Record<string, unknown> => {
  const raw: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      raw[row.key] = JSON.parse(row.value_json);
    } catch {}
  }
  return raw;
};

const rawToStartStateShape = (raw: Record<string, unknown>) => ({
  composerShortcut: raw[stateKey.composerShortcut],
  lastWorkspace: raw[stateKey.lastWorkspace],
  selectedModelKey: raw[stateKey.selectedModelKey],
  selectedThinkingLevel: raw[stateKey.selectedThinkingLevel],
  sessionNotices: raw[stateKey.sessionNotices],
  workspaceBookmarks: raw[stateKey.workspaceBookmarks]
});

export const readStartState = (): StartState => {
  try {
    return parseStartState(rawToStartStateShape(rowsToRaw(readAllRows())));
  } catch {
    return defaultStartState;
  }
};

export const writeStartState = (state: StartState): StartState => {
  const nextState = parseStartState(state);
  runStartTransaction(() => {
    writeRow(stateKey.composerShortcut, nextState.composerShortcut);
    writeRow(stateKey.selectedThinkingLevel, nextState.selectedThinkingLevel);
    writeOrDeleteRow(stateKey.lastWorkspace, nextState.lastWorkspace);
    writeOrDeleteRow(stateKey.selectedModelKey, nextState.selectedModelKey);
    writeOrDeleteRow(stateKey.sessionNotices, nextState.sessionNotices);
    writeOrDeleteRow(stateKey.workspaceBookmarks, nextState.workspaceBookmarks);
  });
  return nextState;
};

export const updateStartState = (patch: Partial<StartState>): StartState =>
  writeStartState({ ...readStartState(), ...patch });
