import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const openDbMock = vi.fn();

vi.mock('@main/db', () => ({
  openStartDb: () => openDbMock(),
  closeStartDb: () => undefined
}));

const migration = `
  CREATE TABLE sessions (
    id                   TEXT    PRIMARY KEY,
    path                 TEXT    NOT NULL,
    cwd                  TEXT    NOT NULL,
    title                TEXT,
    model_provider       TEXT,
    model_id             TEXT,
    thinking_level       TEXT,
    total_input_tokens   INTEGER NOT NULL DEFAULT 0,
    total_output_tokens  INTEGER NOT NULL DEFAULT 0,
    archived             INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
    archived_at          INTEGER,
    app_version          TEXT,
    created_at           INTEGER NOT NULL,
    updated_at           INTEGER NOT NULL
  );
`;

let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  db.exec(migration);
  openDbMock.mockReturnValue(db);
});

afterEach(() => {
  db.close();
  vi.resetModules();
});

describe('sessions module', () => {
  it('upsertSessionOnStart inserts a row that getSession can read back', async () => {
    const { getSession, upsertSessionOnStart } = await import('@main/sessions');
    upsertSessionOnStart({
      id: 'sess-1',
      cwd: '/work/foo',
      path: '/jsonl/sess-1.jsonl',
      modelId: 'claude-opus-4-7',
      modelProvider: 'anthropic',
      thinkingLevel: 'medium',
      appVersion: '0.1.0'
    });

    const row = getSession('sess-1');
    expect(row?.cwd).toBe('/work/foo');
    expect(row?.modelProvider).toBe('anthropic');
    expect(row?.modelId).toBe('claude-opus-4-7');
    expect(row?.archived).toBe(false);
    expect(row?.totalInputTokens).toBe(0);
    expect(row?.title).toBe('Untitled session');
  });

  it('updateSessionOnTurnEnd accumulates tokens and sets title only if empty', async () => {
    const { getSession, updateSessionOnTurnEnd, upsertSessionOnStart } = await import('@main/sessions');
    upsertSessionOnStart({ id: 's', cwd: '/a', path: '/p' });

    updateSessionOnTurnEnd('s', { inputTokens: 100, outputTokens: 50, firstMessage: 'Hello world' });
    expect(getSession('s')?.totalInputTokens).toBe(100);
    expect(getSession('s')?.totalOutputTokens).toBe(50);
    expect(getSession('s')?.title).toBe('Hello world');

    updateSessionOnTurnEnd('s', { inputTokens: 30, outputTokens: 5, firstMessage: 'Different title' });
    expect(getSession('s')?.totalInputTokens).toBe(130);
    expect(getSession('s')?.totalOutputTokens).toBe(55);
    // title remains the first message; updateTitleIfEmpty preserves existing
    expect(getSession('s')?.title).toBe('Hello world');
  });

  it('updateSessionTitle replaces the title and applies truncation', async () => {
    const { getSession, updateSessionTitle, upsertSessionOnStart } = await import('@main/sessions');
    upsertSessionOnStart({ id: 's', cwd: '/a', path: '/p' });

    updateSessionTitle('s', 'a'.repeat(200));
    const row = getSession('s');
    expect(row?.title).toMatch(/^a+…$/);
    expect(row?.title.length).toBe(120);
  });

  it('archiveSession / unarchiveSession toggle the flag and timestamps', async () => {
    const { archiveSession, getSession, unarchiveSession, upsertSessionOnStart } = await import('@main/sessions');
    upsertSessionOnStart({ id: 's', cwd: '/a', path: '/p' });

    archiveSession('s');
    const archived = getSession('s');
    expect(archived?.archived).toBe(true);
    expect(typeof archived?.archivedAt).toBe('number');

    unarchiveSession('s');
    const unarchived = getSession('s');
    expect(unarchived?.archived).toBe(false);
    expect(unarchived?.archivedAt).toBeUndefined();
  });

  it('listSessionsByCwd returns only non-archived in the right cwd, ordered by updated_at desc', async () => {
    const { archiveSession, listSessionsByCwd, upsertSessionOnStart, updateSessionOnTurnEnd } = await import(
      '@main/sessions'
    );
    upsertSessionOnStart({ id: 'a', cwd: '/x', path: '/p1' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    upsertSessionOnStart({ id: 'b', cwd: '/x', path: '/p2' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    upsertSessionOnStart({ id: 'c', cwd: '/y', path: '/p3' });
    archiveSession('b');

    // bump 'a' to be most-recent
    updateSessionOnTurnEnd('a', { inputTokens: 1, outputTokens: 1 });

    const rows = listSessionsByCwd('/x', { limit: 10, offset: 0, archived: false });
    expect(rows.map((row) => row.id)).toEqual(['a']);

    const archivedRows = listSessionsByCwd('/x', { limit: 10, offset: 0, archived: true });
    expect(archivedRows.map((row) => row.id)).toEqual(['b']);
  });

  it('getSession returns undefined for an unknown id', async () => {
    const { getSession } = await import('@main/sessions');
    expect(getSession('nope')).toBeUndefined();
  });
});
