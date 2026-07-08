import { join } from 'node:path';
import { baseDir } from '@main/application';
import { openStartDb, runStartTransaction, type StartStatement } from '@main/db';
import { readRequiredString, type SqliteRow } from '@main/sqlite/row';
import type { EffortLevel, SessionNotice } from '@main/types';
import { logger } from '@main/utils/logger';
import * as v from 'valibot';

export interface MobileRelaySettings {
  enabled: boolean;
  desktopId: string;
  relayUrl: string;
  desktopName: string;
  relayToken: string;
}

export interface TrustedMobileDevice {
  mobileId: string;
  trustKey: string;
  name?: string;
  pairedAt: number;
  lastSeenAt?: number;
}

export type StartState = {
  keepAwake: boolean;
  lastWorkspace?: string;
  mobileRelay: MobileRelaySettings;
  composerShortcut: string;
  selectedModelKey?: string;
  solidWindowBackground: boolean;
  selectedThinkingLevel: EffortLevel;
  workspaceHistory?: Record<string, number>;
  workspaceBookmarks?: Record<string, string>;
  sessionNotices?: Record<string, SessionNotice>;
  trustedMobileDevices?: Record<string, TrustedMobileDevice>;
};

const defaultMobileRelay = {
  enabled: false,
  desktopId: '',
  relayUrl: '',
  desktopName: '',
  relayToken: ''
} satisfies MobileRelaySettings;

const defaultStartState = {
  keepAwake: true,
  mobileRelay: defaultMobileRelay,
  solidWindowBackground: false,
  selectedThinkingLevel: 'high',
  composerShortcut: 'Control+Space'
} satisfies StartState;

export const startDir = () => baseDir;
export const startCacheDir = () => join(startDir(), 'cache');

const trimmedOptionalStringSchema = v.pipe(v.string(), v.trim());
const trimmedStringSchema = v.pipe(trimmedOptionalStringSchema, v.minLength(1));
const finiteNumberSchema = v.pipe(v.number(), v.finite());
const thinkingLevelSchema = v.picklist(['low', 'medium', 'high', 'xhigh'] satisfies EffortLevel[]);
const mobileRelaySchema = v.object({
  enabled: v.boolean(),
  desktopId: v.optional(trimmedOptionalStringSchema),
  desktopName: v.optional(trimmedOptionalStringSchema),
  relayToken: v.optional(trimmedOptionalStringSchema),
  relayUrl: v.optional(trimmedOptionalStringSchema)
});
const sessionNoticeSchema = v.object({
  kind: v.picklist(['completed', 'failed'] satisfies SessionNotice['kind'][]),
  seenAt: v.optional(finiteNumberSchema),
  createdAt: v.optional(finiteNumberSchema),
  sessionId: v.optional(trimmedStringSchema),
  workspacePath: trimmedStringSchema
});
const trustedMobileDeviceSchema = v.object({
  name: v.optional(trimmedStringSchema),
  pairedAt: v.optional(finiteNumberSchema),
  trustKey: trimmedStringSchema,
  lastSeenAt: v.optional(finiteNumberSchema),
  mobileId: v.optional(trimmedStringSchema)
});
const stringRecordEntrySchema = v.tuple([trimmedStringSchema, trimmedStringSchema]);
const workspaceHistoryEntrySchema = v.tuple([trimmedStringSchema, finiteNumberSchema]);

const parseTrimmedString = (value: unknown) => {
  const result = v.safeParse(trimmedStringSchema, value);
  if (result.success) return result.output;
  return;
};

const recordEntries = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value);
};

const parseStringRecord = (value: unknown) => {
  const entries = recordEntries(value).flatMap((entry) => {
    const result = v.safeParse(stringRecordEntrySchema, entry);
    return result.success ? [result.output] : [];
  });

  if (entries.length > 0) return Object.fromEntries(entries);
  return;
};

const parseWorkspaceHistory = (value: unknown) => {
  const entries = recordEntries(value).flatMap((entry) => {
    const result = v.safeParse(workspaceHistoryEntrySchema, entry);
    return result.success ? [result.output] : [];
  });

  if (entries.length > 0) return Object.fromEntries(entries);
  return;
};

const parseSessionNotices = (value: unknown) => {
  const notices: Record<string, SessionNotice> = {};

  for (const [key, entry] of recordEntries(value)) {
    const result = v.safeParse(sessionNoticeSchema, entry);
    if (!result.success) continue;

    const sessionId = result.output.sessionId ?? parseTrimmedString(key);
    if (!sessionId) continue;

    notices[sessionId] = {
      sessionId,
      kind: result.output.kind,
      workspacePath: result.output.workspacePath,
      createdAt: result.output.createdAt ?? Date.now(),
      ...(result.output.seenAt ? { seenAt: result.output.seenAt } : {})
    };
  }

  if (Object.keys(notices).length > 0) return notices;
  return;
};

const parseTrustedMobileDevices = (value: unknown) => {
  const devices: Record<string, TrustedMobileDevice> = {};

  for (const [key, entry] of recordEntries(value)) {
    const result = v.safeParse(trustedMobileDeviceSchema, entry);
    if (!result.success) continue;

    const mobileId = result.output.mobileId ?? parseTrimmedString(key);
    if (!mobileId) continue;

    devices[mobileId] = {
      mobileId,
      trustKey: result.output.trustKey,
      pairedAt: result.output.pairedAt ?? Date.now(),
      ...(result.output.name ? { name: result.output.name } : {}),
      ...(result.output.lastSeenAt ? { lastSeenAt: result.output.lastSeenAt } : {})
    };
  }

  if (Object.keys(devices).length > 0) return devices;
  return;
};

const parseMobileRelay = (value: unknown): MobileRelaySettings => {
  const result = v.safeParse(mobileRelaySchema, value);
  if (!result.success) return defaultMobileRelay;

  return {
    enabled: result.output.enabled,
    desktopId: result.output.desktopId ?? '',
    desktopName: result.output.desktopName ?? '',
    relayUrl: result.output.relayUrl ?? '',
    relayToken: result.output.relayToken ?? ''
  };
};

const parseThinkingLevel = (value: unknown): EffortLevel => {
  const result = v.safeParse(thinkingLevelSchema, value);
  return result.success ? result.output : defaultStartState.selectedThinkingLevel;
};

export const parseStartState = (value: unknown): StartState => {
  if (!value || typeof value !== 'object') return defaultStartState;
  const state = value as Partial<StartState>;
  const lastWorkspace = parseTrimmedString(state.lastWorkspace);
  const selectedModelKey = parseTrimmedString(state.selectedModelKey);
  const sessionNotices = parseSessionNotices(state.sessionNotices);
  const workspaceHistory = parseWorkspaceHistory(state.workspaceHistory);
  const workspaceBookmarks = parseStringRecord(state.workspaceBookmarks);
  const trustedMobileDevices = parseTrustedMobileDevices(state.trustedMobileDevices);
  return {
    keepAwake: state.keepAwake !== false,
    mobileRelay: parseMobileRelay(state.mobileRelay),
    composerShortcut: parseTrimmedString(state.composerShortcut) ?? defaultStartState.composerShortcut,
    solidWindowBackground: state.solidWindowBackground === true,
    selectedThinkingLevel: parseThinkingLevel(state.selectedThinkingLevel),
    ...(lastWorkspace ? { lastWorkspace } : {}),
    ...(selectedModelKey ? { selectedModelKey } : {}),
    ...(sessionNotices ? { sessionNotices } : {}),
    ...(workspaceHistory ? { workspaceHistory } : {}),
    ...(trustedMobileDevices ? { trustedMobileDevices } : {}),
    ...(workspaceBookmarks ? { workspaceBookmarks } : {})
  };
};

const stateKey = {
  keepAwake: 'keep_awake',
  lastWorkspace: 'last_workspace',
  mobileRelay: 'mobile_relay',
  composerShortcut: 'composer_shortcut',
  selectedModelKey: 'selected_model_key',
  workspaceHistory: 'workspace_history',
  workspaceBookmarks: 'workspace_bookmarks',
  sessionNotices: 'session_notices',
  trustedMobileDevices: 'trusted_mobile_devices',
  selectedThinkingLevel: 'selected_thinking_level',
  solidWindowBackground: 'solid_window_background'
} as const satisfies Record<keyof StartState, string>;

type StateRow = { key: string; value_json: string };

interface AppStateStatements {
  remove: StartStatement;
  upsert: StartStatement;
  selectAll: StartStatement;
}

let cachedStatements: AppStateStatements | null = null;

const statements = (): AppStateStatements => {
  if (cachedStatements) return cachedStatements;
  const db = openStartDb();
  cachedStatements = {
    remove: db.prepare('DELETE FROM app_state WHERE key = ?'),
    selectAll: db.prepare('SELECT key, value_json FROM app_state'),
    upsert: db.prepare(
      'INSERT INTO app_state (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at'
    )
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
  if (value == null) {
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
    } catch (error) {
      logger.error('storage parse', error);
    }
  }
  return raw;
};

const rawToStartStateShape = (raw: Record<string, unknown>) => ({
  lastWorkspace: raw[stateKey.lastWorkspace],
  mobileRelay: raw[stateKey.mobileRelay],
  composerShortcut: raw[stateKey.composerShortcut],
  selectedModelKey: raw[stateKey.selectedModelKey],
  workspaceHistory: raw[stateKey.workspaceHistory],
  workspaceBookmarks: raw[stateKey.workspaceBookmarks],
  sessionNotices: raw[stateKey.sessionNotices],
  trustedMobileDevices: raw[stateKey.trustedMobileDevices],
  selectedThinkingLevel: raw[stateKey.selectedThinkingLevel],
  solidWindowBackground: raw[stateKey.solidWindowBackground]
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
    writeRow(stateKey.mobileRelay, nextState.mobileRelay);
    writeRow(stateKey.composerShortcut, nextState.composerShortcut);
    writeRow(stateKey.selectedThinkingLevel, nextState.selectedThinkingLevel);
    writeRow(stateKey.solidWindowBackground, nextState.solidWindowBackground);
    writeOrDeleteRow(stateKey.lastWorkspace, nextState.lastWorkspace);
    writeOrDeleteRow(stateKey.selectedModelKey, nextState.selectedModelKey);
    writeOrDeleteRow(stateKey.workspaceHistory, nextState.workspaceHistory);
    writeOrDeleteRow(stateKey.workspaceBookmarks, nextState.workspaceBookmarks);
    writeOrDeleteRow(stateKey.sessionNotices, nextState.sessionNotices);
    writeOrDeleteRow(stateKey.trustedMobileDevices, nextState.trustedMobileDevices);
  });
  return nextState;
};

export const updateStartState = (patch: Partial<StartState>): StartState =>
  writeStartState({ ...readStartState(), ...patch });
