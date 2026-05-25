import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { parseSessionEntries } from '@earendil-works/pi-coding-agent';

const baseDir = process.env.START_BASE_DIR || join(homedir(), '.start');
const sessionsDir = join(baseDir, 'agent', 'sessions');
const dbPath = join(baseDir, 'state.db');
const titleMaxLength = 120;

const truncateTitle = (text) => {
  const trimmed = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!trimmed) return 'Untitled session';
  if (trimmed.length <= titleMaxLength) return trimmed;
  return `${trimmed.slice(0, titleMaxLength - 1).trimEnd()}…`;
};

const textFromContent = (content) => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  for (const part of content) {
    if (part && typeof part === 'object' && part.type === 'text' && typeof part.text === 'string') {
      return part.text;
    }
  }
  return '';
};

const walkJsonlFiles = (dir) => {
  const out = [];
  if (!existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(path);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.jsonl')) out.push(path);
    }
  }
  return out;
};

const summarize = (filePath) => {
  const content = readFileSync(filePath, 'utf8');
  const fileEntries = parseSessionEntries(content);
  const header = fileEntries.find((entry) => entry.type === 'session');
  if (!header) return;
  const entries = fileEntries.filter((entry) => entry.type !== 'session');

  let firstUserText = '';
  let title;
  let modelProvider;
  let modelId;
  let thinkingLevel;
  let totalInput = 0;
  let totalOutput = 0;

  for (const entry of entries) {
    if (entry.type === 'message' && entry.message?.role === 'user' && !firstUserText) {
      firstUserText = textFromContent(entry.message.content);
    }
    if (entry.type === 'session_info' && entry.name) title = entry.name;
    if (entry.type === 'model_change') {
      modelProvider = entry.provider;
      modelId = entry.modelId;
    }
    if (entry.type === 'thinking_level_change') thinkingLevel = entry.thinkingLevel;
    if (entry.type === 'message' && entry.message?.role === 'assistant') {
      const usage = entry.message.usage;
      if (usage && typeof usage === 'object') {
        totalInput += Number(usage.input ?? 0);
        totalOutput += Number(usage.output ?? 0);
      }
    }
  }

  const resolvedTitle = title ?? (firstUserText ? truncateTitle(firstUserText) : undefined);
  const stats = statSync(filePath);

  return {
    id: header.id,
    path: filePath,
    cwd: header.cwd ?? '',
    title: resolvedTitle ?? null,
    modelProvider: modelProvider ?? null,
    modelId: modelId ?? null,
    thinkingLevel: thinkingLevel ?? null,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    appVersion: null,
    createdAt: Math.floor(stats.birthtimeMs || stats.mtimeMs),
    updatedAt: Math.floor(stats.mtimeMs)
  };
};

const usageHint = () => {
  process.stdout.write('Rebuilds <baseDir>/state.db sessions table from JSONL files at <baseDir>/agent/sessions/.\n');
  process.stdout.write('Override the location with START_BASE_DIR=/path/to/.start before running.\n');
};

const main = () => {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    usageHint();
    return;
  }
  mkdirSync(baseDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  if (!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sessions'").get()) {
    throw new Error(`sessions table does not exist in ${dbPath}; run the app once before rebuilding.`);
  }

  const files = walkJsonlFiles(sessionsDir);
  const rows = files.map(summarize).filter((row) => row?.id);

  const insertOrReplace = db.prepare(
    `INSERT INTO sessions (id, path, cwd, title, model_provider, model_id, thinking_level, total_input_tokens, total_output_tokens, archived, archived_at, app_version, created_at, updated_at)
     VALUES (@id, @path, @cwd, @title, @modelProvider, @modelId, @thinkingLevel, @totalInputTokens, @totalOutputTokens, 0, NULL, @appVersion, @createdAt, @updatedAt)
     ON CONFLICT(id) DO UPDATE SET
       path                = excluded.path,
       cwd                 = excluded.cwd,
       title               = COALESCE(excluded.title, sessions.title),
       model_provider      = excluded.model_provider,
       model_id            = excluded.model_id,
       thinking_level      = excluded.thinking_level,
       total_input_tokens  = excluded.total_input_tokens,
       total_output_tokens = excluded.total_output_tokens,
       updated_at          = MAX(sessions.updated_at, excluded.updated_at)`
  );

  const apply = db.transaction((records) => {
    for (const row of records) insertOrReplace.run(row);
  });
  apply(rows);

  db.pragma('optimize');
  db.close();
  process.stdout.write(`Repopulated ${rows.length} session row(s) in ${dbPath}.\n`);
};

main();
