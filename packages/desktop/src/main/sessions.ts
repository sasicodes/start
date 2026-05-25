import { openStartDb, type StartStatement } from '@main/db';
import {
  readOptionalNumber,
  readOptionalString,
  readRequiredNumber,
  readRequiredString,
  type SqliteRow
} from '@main/sqlite-row';

const titleMaxLength = 120;

export interface SessionRecord {
  id: string;
  cwd: string;
  path: string;
  title: string;
  modelId?: string;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
  appVersion?: string;
  modelProvider?: string;
  thinkingLevel?: string;
  totalInputTokens: number;
  totalOutputTokens: number;
}

interface SessionRow {
  id: string;
  cwd: string;
  path: string;
  archived: number;
  created_at: number;
  updated_at: number;
  title: string | null;
  model_id: string | null;
  app_version: string | null;
  archived_at: number | null;
  total_input_tokens: number;
  total_output_tokens: number;
  model_provider: string | null;
  thinking_level: string | null;
}

interface UpsertOnStartInput {
  id: string;
  cwd: string;
  path: string;
  modelId?: string;
  appVersion?: string;
  modelProvider?: string;
  thinkingLevel?: string;
}

interface UpdateOnTurnEndInput {
  inputTokens: number;
  outputTokens: number;
  firstMessage?: string;
}

interface ListOptions {
  limit: number;
  offset: number;
  archived?: boolean;
}

export const truncateTitle = (text: string): string => {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return 'Untitled session';
  if (trimmed.length <= titleMaxLength) return trimmed;
  return `${trimmed.slice(0, titleMaxLength - 1).trimEnd()}…`;
};

interface Statements {
  insert: StartStatement;
  archive: StartStatement;
  unarchive: StartStatement;
  selectById: StartStatement;
  updateTitle: StartStatement;
  updateTurnEnd: StartStatement;
  updateThinking: StartStatement;
  listByCwdActive: StartStatement;
  listByCwdArchived: StartStatement;
  updateTitleIfEmpty: StartStatement;
}

let cachedStatements: Statements | undefined;

const statements = (): Statements => {
  if (cachedStatements) return cachedStatements;
  const db = openStartDb();
  cachedStatements = {
    insert: db.prepare(
      `INSERT INTO sessions (id, path, cwd, model_provider, model_id, thinking_level, app_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`
    ),
    archive: db.prepare('UPDATE sessions SET archived = 1, archived_at = ?, updated_at = ? WHERE id = ?'),
    unarchive: db.prepare('UPDATE sessions SET archived = 0, archived_at = NULL, updated_at = ? WHERE id = ?'),
    selectById: db.prepare('SELECT * FROM sessions WHERE id = ?'),
    updateTitle: db.prepare('UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?'),
    updateTurnEnd: db.prepare(
      `UPDATE sessions
         SET total_input_tokens  = total_input_tokens + ?,
             total_output_tokens = total_output_tokens + ?,
             updated_at          = ?
         WHERE id = ?`
    ),
    updateThinking: db.prepare('UPDATE sessions SET thinking_level = ?, updated_at = ? WHERE id = ?'),
    listByCwdActive: db.prepare(
      'SELECT * FROM sessions WHERE cwd = ? AND archived = 0 ORDER BY updated_at DESC LIMIT ? OFFSET ?'
    ),
    listByCwdArchived: db.prepare(
      'SELECT * FROM sessions WHERE cwd = ? AND archived = 1 ORDER BY updated_at DESC LIMIT ? OFFSET ?'
    ),
    updateTitleIfEmpty: db.prepare('UPDATE sessions SET title = COALESCE(title, ?), updated_at = ? WHERE id = ?')
  };
  return cachedStatements;
};

const rowToRecord = (row: SessionRow): SessionRecord => ({
  id: row.id,
  cwd: row.cwd,
  path: row.path,
  title: row.title ?? 'Untitled session',
  archived: row.archived === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  totalInputTokens: row.total_input_tokens,
  totalOutputTokens: row.total_output_tokens,
  ...(row.model_id ? { modelId: row.model_id } : {}),
  ...(row.app_version ? { appVersion: row.app_version } : {}),
  ...(row.archived_at !== null ? { archivedAt: row.archived_at } : {}),
  ...(row.model_provider ? { modelProvider: row.model_provider } : {}),
  ...(row.thinking_level ? { thinkingLevel: row.thinking_level } : {})
});

const toSessionRow = (row: SqliteRow): SessionRow => ({
  id: readRequiredString(row, 'id'),
  cwd: readRequiredString(row, 'cwd'),
  path: readRequiredString(row, 'path'),
  title: readOptionalString(row, 'title'),
  archived: readRequiredNumber(row, 'archived'),
  created_at: readRequiredNumber(row, 'created_at'),
  updated_at: readRequiredNumber(row, 'updated_at'),
  app_version: readOptionalString(row, 'app_version'),
  archived_at: readOptionalNumber(row, 'archived_at'),
  model_id: readOptionalString(row, 'model_id'),
  model_provider: readOptionalString(row, 'model_provider'),
  thinking_level: readOptionalString(row, 'thinking_level'),
  total_input_tokens: readRequiredNumber(row, 'total_input_tokens'),
  total_output_tokens: readRequiredNumber(row, 'total_output_tokens')
});

export const upsertSessionOnStart = (input: UpsertOnStartInput): void => {
  const now = Date.now();
  statements().insert.run(
    input.id,
    input.path,
    input.cwd,
    input.modelProvider ?? null,
    input.modelId ?? null,
    input.thinkingLevel ?? null,
    input.appVersion ?? null,
    now,
    now
  );
};

export const updateSessionOnTurnEnd = (id: string, input: UpdateOnTurnEndInput): void => {
  const now = Date.now();
  statements().updateTurnEnd.run(input.inputTokens, input.outputTokens, now, id);
  if (input.firstMessage !== undefined) {
    statements().updateTitleIfEmpty.run(truncateTitle(input.firstMessage), now, id);
  }
};

export const updateSessionThinkingLevel = (id: string, level: string): void => {
  statements().updateThinking.run(level, Date.now(), id);
};

export const updateSessionTitle = (id: string, title: string): void => {
  statements().updateTitle.run(truncateTitle(title), Date.now(), id);
};

export const archiveSession = (id: string): void => {
  const now = Date.now();
  statements().archive.run(now, now, id);
};

export const unarchiveSession = (id: string): void => {
  statements().unarchive.run(Date.now(), id);
};

export const getSession = (id: string): SessionRecord | undefined => {
  const rawRow = statements().selectById.get(id);
  if (!rawRow) return;
  return rowToRecord(toSessionRow(rawRow));
};

export const listSessionsByCwd = (cwd: string, options: ListOptions): SessionRecord[] => {
  const stmt = options.archived ? statements().listByCwdArchived : statements().listByCwdActive;
  const rows = stmt.all(cwd, options.limit, options.offset).map(toSessionRow);
  return rows.map(rowToRecord);
};
